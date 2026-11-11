// Renders one puzzle video for local testing.
// Usage: npm run make -- --family freefall --seed 3 --out output/test [--layout landscape] [--lines file.json]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderVideo } from '../core/render';
import { arg } from '../core/util';

const family = arg('family', 'freefall')!;
const seed = Number(arg('seed', '1'));
const layout = arg('layout', 'portrait') as 'portrait' | 'landscape';
const linesFile = arg('lines');

renderVideo({
  family,
  seed,
  layout,
  outDir: arg('out', 'output/test')!,
  name: arg('name', `${family}-${seed}-${layout}`)!,
  lines: linesFile ? JSON.parse(readFileSync(linesFile, 'utf8')) : undefined,
})
  .then((r) => {
    writeFileSync(r.video.replace(/\.mp4$/, '.json'), JSON.stringify({ puzzle: r.puzzle, lines: r.lines, seconds: r.seconds }, null, 1));
    console.log(`done: ${r.video} (${r.seconds.toFixed(1)}s)`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
