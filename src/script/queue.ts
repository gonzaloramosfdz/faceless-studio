import type { Line } from '../core/types';
import { readJson, writeJson } from '../core/util';

export type Platform = 'youtube' | 'instagram';
export const PLATFORMS: Platform[] = ['youtube', 'instagram'];

export interface PlatformResult {
  state: 'published' | 'private' | 'held' | 'skipped' | 'error';
  id?: string;
  url?: string;
  error?: string;
}

export interface QueueItem {
  id: string; // date-slot, e.g. 2026-11-16-1
  date: string;
  slot: 1 | 2;
  family: string;
  seed: number;
  key: string;
  /** `family:variant`. Never repeated within IDEA_GAP_DAYS. */
  idea: string;
  lines: Line[];
  title: string;
  description: string;
  tags: string[];
  wording: 'llm' | 'template';
  status: 'queued' | 'review' | 'published' | 'failed';
  platforms: Partial<Record<Platform, PlatformResult>>;
  issue?: number;
  runId?: string;
  seconds?: number;
}

export const IDEA_GAP_DAYS = 12;
export const REVIEW_POSTS = 5;

export const ideaOf = (key: string) => key.split(':').slice(0, 2).join(':');

export const loadQueue = () => readJson<QueueItem[]>('queue.json', []);
export const saveQueue = (q: QueueItem[]) => writeJson('queue.json', q);
/** Finished items, newest last. Kept forever: it is the dedup record. */
export const loadHistory = () => readJson<QueueItem[]>('history.json', []);
export const saveHistory = (h: QueueItem[]) => writeJson('history.json', h);

/** Approved posts per platform. A platform publishes automatically once it reaches REVIEW_POSTS. */
export const loadReview = () => readJson<Record<Platform, number>>('review.json', { youtube: 0, instagram: 0 });
export const saveReview = (r: Record<Platform, number>) => writeJson('review.json', r);
