// Renders one puzzle video end to end: puzzle -> voice -> timeline -> audio -> video -> mux.
// Usage: npm run make -- --family magic-square --seed 7 --out output/test [--layout landscape]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { families } from '../puzzles/registry';
import { buildTimeline } from '../core/timeline';
import type { Line, VideoProps } from '../core/types';

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const root = path.resolve(import.meta.dirname, '../..');
const python = existsSync(path.join(root, '.venv/bin/python')) ? path.join(root, '.venv/bin/python') : 'python3';
const step = <T>(name: string, fn: () => T | Promise<T>) => {
  const t = Date.now();
  return Promise.resolve(fn()).then((v) => {
    console.log(`[${name}] ${((Date.now() - t) / 1000).toFixed(1)}s`);
    return v;
  });
};

async function main() {
  const familyId = arg('family', 'magic-square')!;
  const seed = Number(arg('seed', '1'));
  const layout = (arg('layout', 'portrait') as VideoProps['layout'])!;
  const out = path.resolve(root, arg('out', 'output/test')!);
  const name = arg('name', `${familyId}-${seed}-${layout}`)!;
  const work = path.join(root, 'work', name);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(out, { recursive: true });

  const family = families[familyId];
  if (!family) throw new Error(`unknown family ${familyId}`);
  const puzzle = family.generate(seed);
  // Narration may be supplied by the weekly batch (LLM-worded); otherwise the template is used.
  const linesFile = arg('lines');
  const lines: Line[] = linesFile ? JSON.parse(readFileSync(linesFile, 'utf8')) : family.narrate(puzzle);

  writeFileSync(path.join(work, 'job.json'), JSON.stringify({ lines }));
  await step('voice', () =>
    execFileSync(python, [path.join(root, 'src/voice/tts.py'), path.join(work, 'job.json'), work], { stdio: 'inherit' }),
  );
  const audio = JSON.parse(readFileSync(path.join(work, 'durations.json'), 'utf8'));
  const timeline = buildTimeline(lines, audio);
  writeFileSync(path.join(work, 'timeline.json'), JSON.stringify(timeline));
  await step('audio', () =>
    execFileSync(python, [path.join(root, 'src/edit/mix.py'), path.join(work, 'timeline.json'), path.join(work, 'audio.wav'), String(seed)], { stdio: 'inherit' }),
  );

  const inputProps = { puzzle, timeline, layout } satisfies VideoProps as unknown as Record<string, unknown>;
  const browserExecutable = process.env.CHROME_PATH || undefined;
  const serveUrl = await step('bundle', () => bundle({ entryPoint: path.join(root, 'src/visuals/index.ts') }));
  const composition = await selectComposition({ serveUrl, id: 'Puzzle', inputProps, browserExecutable });
  const silent = path.join(work, 'silent.mp4');
  await step('render', () =>
    renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: silent, inputProps, browserExecutable, crf: 20, muted: true }),
  );
  await step('thumbnail', () =>
    renderStill({
      composition,
      serveUrl,
      inputProps,
      browserExecutable,
      frame: timeline.countdown.from + 5,
      output: path.join(out, `${name}.jpg`),
      imageFormat: 'jpeg',
    }),
  );
  const final = path.join(out, `${name}.mp4`);
  await step('mux', () =>
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', path.join(work, 'audio.wav'),
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
      '-movflags', '+faststart', '-shortest', final]),
  );
  writeFileSync(path.join(out, `${name}.json`), JSON.stringify({ puzzle, lines, seconds: timeline.durationInFrames / timeline.fps }, null, 1));
  rmSync(work, { recursive: true, force: true });
  console.log(`done: ${final} (${(timeline.durationInFrames / timeline.fps).toFixed(1)}s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
