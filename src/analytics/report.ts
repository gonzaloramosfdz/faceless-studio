// Weekly report: pulls stats for recent posts, saves them, sets family weights for the next batch, opens one issue.
// Usage: tsx src/analytics/report.ts
import { localDate, writeJson, daysBetween } from '../core/util';
import { openIssue } from '../publish/github';
import { instagramStats } from '../publish/meta';
import * as youtube from '../publish/youtube';
import { discoverIdeas } from '../script/plan';
import { IDEA_GAP_DAYS, PLATFORMS, loadHistory, loadQueue, type Platform } from '../script/queue';

const today = localDate();
const history = loadHistory();
const recent = history.filter((h) => daysBetween(h.date, today) <= 28);
const ids = (p: Platform) => recent.map((h) => h.platforms[p]?.id).filter(Boolean) as string[];
const safe = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.log(`[report] ${name} stats unavailable: ${(e as Error).message}`);
    return fallback;
  }
};
const stats = {
  youtube: await safe('youtube', () => youtube.stats(ids('youtube')), {}),
  instagram: PLATFORMS.includes('instagram') ? await safe('instagram', () => instagramStats(ids('instagram')), {}) : {},
};

const rows = recent.map((h) => {
  const v = (p: Platform) => stats[p][h.platforms[p]?.id ?? '']?.views ?? 0;
  return { id: h.id, date: h.date, slot: h.slot, family: h.family, idea: h.idea, title: h.title, youtube: v('youtube'), instagram: v('instagram'), total: v('youtube') + v('instagram') };
});
const week = rows.filter((r) => daysBetween(r.date, today) <= 7);
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const by = <K extends string>(key: (r: (typeof rows)[number]) => K) => {
  const m = new Map<K, number[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r.total]);
  return [...m.entries()].map(([k, v]) => ({ k, posts: v.length, avg: avg(v) })).sort((a, b) => b.avg - a.avg);
};
const families = by((r) => r.family);
const slots = by((r) => `slot ${r.slot}` as string);

// Families that do better get scheduled a little more often; the range is kept narrow so variety holds.
const overall = avg(rows.map((r) => r.total)) || 1;
const weights: Record<string, number> = {};
if (rows.length >= 14) for (const f of families) weights[f.k] = Math.min(1.4, Math.max(0.7, f.avg / overall));
writeJson('weights.json', weights);
writeJson(`analytics/${today}.json`, { date: today, rows, families, slots, weights });

const ideas = discoverIdeas().size;
const queued = loadQueue().filter((q) => q.status === 'queued').length;
const waiting = loadQueue().filter((q) => q.status === 'review').length;
const table = (head: string[], body: (string | number)[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((b) => `| ${b.join(' | ')} |`)].join('\n');
const md = [
  `# Weekly report, ${today}`,
  '',
  `Posts in the last 7 days: **${week.length}**. Views counted so far: **${week.reduce((s, r) => s + r.total, 0)}** (YouTube ${week.reduce((s, r) => s + r.youtube, 0)}, Instagram ${week.reduce((s, r) => s + r.instagram, 0)}).`,
  `Queue: ${queued} posts planned, ${waiting} waiting for your review.`,
  ideas < IDEA_GAP_DAYS * 2 ? `\n**Idea pool is too small:** ${ideas} ideas, but ${IDEA_GAP_DAYS * 2} are needed so none repeats within ${IDEA_GAP_DAYS} days. Add variants.` : `Idea pool: ${ideas} ideas (${IDEA_GAP_DAYS * 2} needed for the ${IDEA_GAP_DAYS}-day rule).`,
  '',
  '## This week, best first',
  table(['Post', 'Idea', 'YouTube', 'Instagram', 'Total'], [...week].sort((a, b) => b.total - a.total).map((r) => [r.id, r.idea, r.youtube, r.instagram, r.total])),
  '',
  '## Last 28 days by family (average views per post)',
  table(['Family', 'Posts', 'Average'], families.map((f) => [f.k, f.posts, f.avg])),
  '',
  '## Last 28 days by posting slot',
  table(['Slot', 'Posts', 'Average'], slots.map((s) => [s.k, s.posts, s.avg])),
  '',
  'Views are the public counters at the time of this report; recent posts are still growing. Instagram numbers may be missing if its insights API refused the request.',
].join('\n');
(await import('node:fs')).writeFileSync((await import('node:path')).join(import.meta.dirname, `../../data/analytics/${today}.md`), md + '\n');
await openIssue(`Weekly report ${today}`, md, ['report']);
console.log(md);
