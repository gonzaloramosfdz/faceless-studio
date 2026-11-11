// Publishes a post that was waiting in the review queue. Usage: tsx src/cli/approve.ts --id 2026-11-16-1 --video path.mp4
import { existsSync } from 'node:fs';
import { arg } from '../core/util';
import { reelCaption } from '../package/metadata';
import { closeIssue } from '../publish/github';
import { facebookReel, instagramReel } from '../publish/meta';
import * as youtube from '../publish/youtube';
import { PLATFORMS, loadHistory, loadQueue, loadReview, saveHistory, saveQueue, saveReview } from '../script/queue';

const queue = loadQueue();
const item = queue.find((q) => q.id === arg('id'));
if (!item || item.status !== 'review') throw new Error(`no post waiting for review with id ${arg('id')}`);
const video = arg('video', '')!;
const review = loadReview();
const errors: string[] = [];

for (const p of PLATFORMS) {
  const cur = item.platforms[p];
  try {
    if (cur?.state === 'private' && p === 'youtube') {
      await youtube.makePublic(cur.id!);
      item.platforms[p] = { ...cur, state: 'published' };
    } else if (cur?.state === 'held') {
      if (!existsSync(video)) throw new Error('held video not found; the artifact may have expired (7 days). Re-run the post with its id.');
      const res = p === 'instagram' ? await instagramReel(video, reelCaption(item)) : await facebookReel(video, reelCaption(item));
      item.platforms[p] = { state: 'published', ...res };
    } else continue;
    review[p]++;
    console.log(`${p}: published (approval ${review[p]})`);
  } catch (e) {
    errors.push(`${p}: ${(e as Error).message}`);
  }
  saveQueue(queue);
  saveReview(review);
}
if (errors.length) throw new Error(errors.join(' | '));
item.status = 'published';
saveHistory([...loadHistory(), item]);
saveQueue(queue.filter((q) => q !== item));
if (item.issue) await closeIssue(item.issue, 'Approved and published.');
