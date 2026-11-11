// Per-platform text for one post. Every platform gets the AI disclosure line.
import type { QueueItem } from '../script/queue';

const hashtags = (tags: string[]) => tags.map((t) => `#${t}`).join(' ');

export function youtubeMeta(item: QueueItem) {
  return {
    title: `${item.title} #shorts`.slice(0, 100),
    description: `${item.description}\n\n${hashtags(item.tags)}`,
    tags: item.tags,
  };
}
/** Instagram and Facebook take a single caption. */
export function reelCaption(item: QueueItem) {
  return `${item.title}\n\n${item.description}\n\n${hashtags(item.tags)}`.slice(0, 2100);
}
