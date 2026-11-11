// Twice-daily job: render the next due puzzle and publish it (or send it to the review queue).
// Usage: tsx src/cli/post.ts [--dry-run] [--id 2026-11-16-1]
// Safe to run twice: platforms that already succeeded for an item are skipped.
import { rmSync } from 'node:fs';
import { renderVideo } from '../core/render';
import { arg, flag, localDate } from '../core/util';
import { reelCaption, youtubeMeta } from '../package/metadata';
import { openIssue, runUrl } from '../publish/github';
import { facebookReel, instagramReel } from '../publish/meta';
import * as youtube from '../publish/youtube';
import { PLATFORMS, REVIEW_POSTS, loadHistory, loadQueue, loadReview, saveHistory, saveQueue, type Platform, type QueueItem } from '../script/queue';

const dry = flag('dry-run');
const queue = loadQueue();
const today = localDate();
const wanted = arg('id');
const item = wanted ? queue.find((q) => q.id === wanted) : queue.filter((q) => q.status === 'queued' && q.date <= today).sort((a, b) => a.id.localeCompare(b.id))[0];
if (!item) {
  console.log(`nothing due (today is ${today}, ${queue.filter((q) => q.status === 'queued').length} items queued)`);
  process.exit(queue.some((q) => q.status === 'queued') || dry ? 0 : 1); // an empty queue is a real failure
}

console.log(`posting ${item.id}: ${item.idea} (${item.wording} wording)${dry ? ' [dry run: no uploads]' : ''}`);
const r = await renderVideo({ family: item.family, seed: item.seed, lines: item.lines, outDir: 'output/post', name: item.id });
item.seconds = r.seconds;
if (r.puzzle.key !== item.key) throw new Error(`puzzle changed since it was planned: ${item.key} -> ${r.puzzle.key}`);
console.log(`rendered ${r.seconds.toFixed(1)}s video`);

if (dry) {
  console.log(`dry run: would upload to ${PLATFORMS.join(', ')}`);
  console.log(JSON.stringify({ youtube: youtubeMeta(item), reels: reelCaption(item) }, null, 1));
  process.exit(0);
}

const review = loadReview();
const errors: string[] = [];
const save = () => saveQueue(queue);
const attempt = async (p: Platform, fn: () => Promise<{ id: string; url: string }>, state: 'published' | 'private') => {
  const prev = item.platforms[p];
  if (prev && prev.state !== 'error') return;
  try {
    item.platforms[p] = { state, ...(await fn()) };
    console.log(`${p}: ${state}`);
  } catch (e) {
    item.platforms[p] = { state: 'error', error: (e as Error).message };
    errors.push(`${p}: ${(e as Error).message}`);
  }
  save(); // written after every platform so a retry never double-posts
};

const inReview = (p: Platform) => review[p] < REVIEW_POSTS;
const yt = youtubeMeta(item);
await attempt('youtube', () => youtube.upload({ file: r.video, ...yt, privacy: inReview('youtube') ? 'private' : 'public' }), inReview('youtube') ? 'private' : 'published');
for (const p of ['instagram', 'facebook'] as const) {
  if (inReview(p)) {
    // These platforms have no draft mode: the video waits as a workflow artifact until it is approved.
    if (!item.platforms[p]) item.platforms[p] = { state: 'held' };
    save();
  } else {
    await attempt(p, () => (p === 'instagram' ? instagramReel(r.video, reelCaption(item)) : facebookReel(r.video, reelCaption(item))), 'published');
  }
}

const waiting = PLATFORMS.filter((p) => ['private', 'held'].includes(item.platforms[p]?.state ?? ''));
if (errors.length) {
  item.status = 'failed';
  save();
  throw new Error(`upload failed -> ${errors.join(' | ')}`);
}
if (waiting.length) {
  item.status = 'review';
  item.runId = process.env.GITHUB_RUN_ID;
  item.issue = await openIssue(
    `Review: ${item.title}`,
    [
      `**${item.id}** · ${item.idea} · ${r.seconds.toFixed(0)} s`,
      '',
      ...waiting.map((p) => `- ${p}: ${item.platforms[p]!.state === 'private' ? `uploaded as private, watch it at ${item.platforms[p]!.url}` : `held, download the video from the artifacts of ${runUrl()}`} (approval ${review[p] + 1} of ${REVIEW_POSTS})`),
      '',
      `To approve: Actions → "Publish approved" → Run workflow → id \`${item.id}\`.`,
      'To reject: close this issue. Nothing is published.',
    ].join('\n'),
    ['review'],
  );
  save();
  console.log(`sent to review queue: ${waiting.join(', ')}`);
} else {
  item.status = 'published';
  saveHistory([...loadHistory(), item]);
  saveQueue(queue.filter((q) => q !== item));
  rmSync(r.video, { force: true });
  console.log('published everywhere');
}
