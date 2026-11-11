// Renders one puzzle video end to end: voice -> timeline -> audio -> video -> mux.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { families } from '../puzzles/registry';
import { buildTimeline } from './timeline';
import type { Line, Puzzle, VideoProps } from './types';

export const ROOT = path.resolve(import.meta.dirname, '../..');
const python = existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3';

export interface RenderOptions {
  family: string;
  seed: number;
  outDir: string;
  name: string;
  layout?: VideoProps['layout'];
  /** Narration to use instead of the family's template (for LLM-worded lines). */
  lines?: Line[];
  /** Extra thinking time in seconds (used by the long-form compilation). */
  extraThink?: number;
  /** Reuse a Remotion bundle across several renders. */
  serveUrl?: string;
}
export interface RenderResult {
  video: string;
  thumbnail: string;
  seconds: number;
  puzzle: Puzzle;
  lines: Line[];
}

const timed = async <T>(name: string, fn: () => T | Promise<T>): Promise<T> => {
  const t = Date.now();
  const v = await fn();
  console.log(`[${name}] ${((Date.now() - t) / 1000).toFixed(1)}s`);
  return v;
};

export const makeBundle = () => bundle({ entryPoint: path.join(ROOT, 'src/visuals/index.ts') });

export async function renderVideo(o: RenderOptions): Promise<RenderResult> {
  const layout = o.layout ?? 'portrait';
  const outDir = path.resolve(ROOT, o.outDir);
  const work = path.join(ROOT, 'work', o.name);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const family = families[o.family];
  if (!family) throw new Error(`unknown family ${o.family}`);
  const puzzle = family.generate(o.seed);
  const lines = o.lines ?? family.narrate(puzzle);

  writeFileSync(path.join(work, 'job.json'), JSON.stringify({ lines }));
  await timed('voice', () =>
    execFileSync(python, [path.join(ROOT, 'src/voice/tts.py'), path.join(work, 'job.json'), work], { stdio: 'inherit' }),
  );
  const audio = JSON.parse(readFileSync(path.join(work, 'durations.json'), 'utf8'));
  const timeline = buildTimeline(lines, audio, (puzzle.thinkSeconds ?? 6) + (o.extraThink ?? 0));
  writeFileSync(path.join(work, 'timeline.json'), JSON.stringify(timeline));
  await timed('audio', () =>
    execFileSync(python, [path.join(ROOT, 'src/edit/mix.py'), path.join(work, 'timeline.json'), path.join(work, 'audio.wav'), String(o.seed)], { stdio: 'inherit' }),
  );

  const inputProps = { puzzle, timeline, layout } satisfies VideoProps as unknown as Record<string, unknown>;
  const browserExecutable = process.env.CHROME_PATH || undefined;
  if (!browserExecutable) await ensureBrowser();
  const serveUrl = o.serveUrl ?? (await timed('bundle', makeBundle));
  const composition = await selectComposition({ serveUrl, id: 'Puzzle', inputProps, browserExecutable });
  const silent = path.join(work, 'silent.mp4');
  await timed('render', () =>
    renderMedia({ composition, serveUrl, codec: 'h264', outputLocation: silent, inputProps, browserExecutable, crf: 20, muted: true }),
  );
  const thumbnail = path.join(outDir, `${o.name}.jpg`);
  await timed('thumbnail', () =>
    renderStill({ composition, serveUrl, inputProps, browserExecutable, frame: timeline.countdown.from + 5, output: thumbnail, imageFormat: 'jpeg' }),
  );
  const video = path.join(outDir, `${o.name}.mp4`);
  await timed('mux', () =>
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', path.join(work, 'audio.wav'),
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000',
      '-movflags', '+faststart', '-shortest', video]),
  );
  rmSync(work, { recursive: true, force: true });
  return { video, thumbnail, seconds: timeline.durationInFrames / timeline.fps, puzzle, lines };
}
