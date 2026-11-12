// Chooses which puzzles the coming week will post. Pure code: no network, no LLM.
import { families } from '../puzzles/registry';
import { rng } from '../core/rng';
import { daysBetween } from '../core/util';
import { categoryOf } from '../core/categories';
import { IDEA_GAP_DAYS, MAX_PER_CATEGORY_PER_DAY, SLOTS, ideaOf, type QueueItem } from './queue';

/** Families in the daily rotation. Others stay in the code but are not scheduled. */
export const ROTATION_EXCLUDE = new Set(['magic-square']);

export interface PlanInput {
  dates: string[]; // days to fill, one post per slot (see SLOTS)
  past: Pick<QueueItem, 'key' | 'idea' | 'date' | 'family'>[]; // history + still-queued items
  weights: Record<string, number>; // family -> weight from analytics, default 1
  seedBase: number;
}
export interface Planned {
  date: string;
  slot: 1 | 2 | 3 | 4;
  family: string;
  seed: number;
  key: string;
  idea: string;
}

/** Finds every idea each family can produce by sampling seeds. */
export function discoverIdeas(sample = 400): Map<string, { family: string; seeds: number[] }> {
  const ideas = new Map<string, { family: string; seeds: number[] }>();
  for (const [id, family] of Object.entries(families)) {
    if (ROTATION_EXCLUDE.has(id)) continue;
    for (let seed = 1; seed <= sample; seed++) {
      const idea = ideaOf(family.generate(seed).key);
      if (!ideas.has(idea)) ideas.set(idea, { family: id, seeds: [] });
    }
  }
  return ideas;
}

export function plan(input: PlanInput): { items: Planned[]; warnings: string[] } {
  const r = rng(input.seedBase);
  const ideas = discoverIdeas();
  const usedKeys = new Set(input.past.map((p) => p.key));
  const lastUsed = new Map<string, string>();
  for (const p of input.past) if (!lastUsed.has(p.idea) || lastUsed.get(p.idea)! < p.date) lastUsed.set(p.idea, p.date);
  const warnings: string[] = [];
  const items: Planned[] = [];

  for (const date of input.dates) {
    const today = new Set<string>();
    const perCategory = new Map<string, number>();
    for (const slot of SLOTS) {
      // Rest time of each idea in days; an idea never used counts as fully rested.
      const scored = [...ideas.entries()]
        // A family appears once a day and no category more than MAX_PER_CATEGORY_PER_DAY times.
        .filter(([, v]) => !today.has(v.family) && (perCategory.get(categoryOf(v.family)) ?? 0) < MAX_PER_CATEGORY_PER_DAY)
        .map(([idea, v]) => {
          const last = lastUsed.get(idea);
          const rest = last ? daysBetween(last, date) : 999;
          const weight = input.weights[v.family] ?? 1;
          return { idea, family: v.family, rest, score: Math.min(rest, 60) * weight + r.next() * 6 };
        });
      let pool = scored.filter((s) => s.rest >= IDEA_GAP_DAYS);
      if (!pool.length) {
        pool = scored;
        warnings.push(`${date} slot ${slot}: every idea was used in the last ${IDEA_GAP_DAYS} days; reused the most rested one. Add new variants.`);
      }
      pool.sort((a, b) => b.score - a.score);
      // Take the best-rested idea that still has an unused instance.
      let chosen: Planned | undefined;
      for (const pick of pool) {
        const family = families[pick.family];
        for (let i = 0; i < 3000 && !chosen; i++) {
          const seed = r.int(1, 2_000_000_000);
          const p = family.generate(seed);
          if (ideaOf(p.key) === pick.idea && !usedKeys.has(p.key)) chosen = { date, slot, family: pick.family, seed, key: p.key, idea: pick.idea };
        }
        if (chosen) break;
        warnings.push(`${date} slot ${slot}: idea ${pick.idea} has no unused puzzle left. Widen its parameters.`);
        ideas.delete(pick.idea);
      }
      if (!chosen) {
        warnings.push(`${date} slot ${slot}: nothing left to schedule.`);
        continue;
      }
      usedKeys.add(chosen.key);
      lastUsed.set(chosen.idea, date);
      today.add(chosen.family);
      perCategory.set(categoryOf(chosen.family), (perCategory.get(categoryOf(chosen.family)) ?? 0) + 1);
      items.push(chosen);
    }
  }
  return { items, warnings };
}
