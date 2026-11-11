// Weekly batch: plans the next 7 days (14 posts), words them in one LLM call, and saves data/queue.json.
// Usage: tsx src/cli/batch.ts [--days 7] [--start YYYY-MM-DD]
import { families } from '../puzzles/registry';
import { arg, localDate, readJson } from '../core/util';
import { plan } from '../script/plan';
import { loadHistory, loadQueue, saveQueue, type QueueItem } from '../script/queue';
import { wordBatch } from '../script/wording';

const days = Number(arg('days', '7'));
const queue = loadQueue().filter((q) => q.status === 'queued' || q.status === 'review');
const history = loadHistory();
const lastPlanned = [...queue.map((q) => q.date), localDate()].sort().pop()!;
const start = arg('start') ?? localDate(new Date(lastPlanned + 'T12:00:00Z'), 1);
const dates = Array.from({ length: days }, (_, i) => localDate(new Date(start + 'T12:00:00Z'), i));

const { items, warnings } = plan({
  dates,
  past: [...history, ...queue],
  weights: readJson<Record<string, number>>('weights.json', {}),
  seedBase: Date.parse(start) / 86400000,
});

const drafts = items.map((it) => {
  const puzzle = families[it.family].generate(it.seed);
  return { id: `${it.date}-${it.slot}`, it, puzzle, lines: families[it.family].narrate(puzzle) };
});
const wording = await wordBatch(drafts);
const fresh: QueueItem[] = drafts.map(({ id, it }) => {
  const w = wording[id];
  return { id, ...it, lines: w.lines, title: w.title, description: w.description, tags: w.tags, wording: w.source, status: 'queued', platforms: {} };
});
saveQueue([...queue, ...fresh]);
console.log(`planned ${fresh.length} posts for ${dates[0]} to ${dates[dates.length - 1]}`);
for (const f of fresh) console.log(`  ${f.id}  ${f.idea.padEnd(28)} ${f.wording.padEnd(8)} ${f.title}`);
for (const w of warnings) console.log(`WARNING: ${w}`);
if (process.env.GITHUB_STEP_SUMMARY && warnings.length) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, warnings.map((w) => `- ${w}`).join('\n') + '\n');
