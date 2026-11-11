// Weekly long-form video: the week's 7 best puzzles re-rendered in 16:9 with longer thinking time, with chapters.
// Usage: tsx src/cli/longform.ts [--dry-run]
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, makeBundle, renderVideo } from '../core/render';
import { flag, localDate, daysBetween, readJson, writeJson } from '../core/util';
import * as youtube from '../publish/youtube';
import { DISCLOSURE } from '../script/wording';
import { loadHistory, loadReview, REVIEW_POSTS } from '../script/queue';

const dry = flag('dry-run');
const today = localDate();
const week = loadHistory().filter((h) => daysBetween(h.date, today) <= 7);
const latest = readJson<{ rows: { id: string; total: number }[] }>(`analytics/${today}.json`, { rows: [] });
const views = new Map(latest.rows.map((r) => [r.id, r.total]));
// Best-viewed first, at most two per family so the compilation stays varied.
const picked: typeof week = [];
for (const h of [...week].sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0))) {
  if (picked.filter((p) => p.family === h.family).length < 2) picked.push(h);
  if (picked.length === 7) break;
}
if (picked.length < 5) {
  console.log(`only ${picked.length} posts this week: skipping the long-form video`);
  process.exit(0);
}

const serveUrl = await makeBundle();
const parts: string[] = [];
const chapters: string[] = [];
let t = 0;
for (const [i, h] of picked.entries()) {
  const r = await renderVideo({ family: h.family, seed: h.seed, lines: h.lines, layout: 'landscape', extraThink: 6, outDir: 'output/long', name: `part-${i}`, serveUrl });
  parts.push(r.video);
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  chapters.push(`${mm}:${String(ss).padStart(2, '0')} ${h.title}`);
  t += r.seconds;
}
const list = path.join(ROOT, 'output/long/list.txt');
writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
const out = path.join(ROOT, 'output/long', `long-${today}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
console.log(`long-form video: ${(t / 60).toFixed(1)} min, ${picked.length} puzzles`);

const title = `${picked.length} physics puzzles: can you predict what happens?`;
const description = [`Pause at each timer, pick your answer, then watch the simulation.`, '', ...chapters, '', DISCLOSURE, '', '#physics #puzzle #science'].join('\n');
if (dry) {
  console.log(`dry run: would upload "${title}"\n${description}`);
} else {
  const res = await youtube.upload({ file: out, title, description, tags: ['physics', 'puzzle', 'science'], privacy: loadReview().youtube < REVIEW_POSTS ? 'private' : 'public' });
  const log = readJson<any[]>('longform.json', []);
  writeJson('longform.json', [...log, { date: today, ...res, puzzles: picked.map((p) => p.id) }]);
  console.log(`uploaded ${res.url}`);
}
for (const p of [...parts, out]) rmSync(p, { force: true });
