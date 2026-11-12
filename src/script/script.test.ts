import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, discoverIdeas } from './plan';
import { templateWording, validate } from './wording';
import { families } from '../puzzles/registry';
import { IDEA_GAP_DAYS } from './queue';
import { categoryOf } from '../core/categories';
import { daysBetween, localDate } from '../core/util';

test('planner: 8 weeks of 4 posts a day, no repeated puzzle, no family twice a day, at most 2 per category, ideas rest 12 days when the pool allows', () => {
  const ideas = discoverIdeas();
  const past: any[] = [];
  let gapBreaks = 0;
  for (let week = 0; week < 8; week++) {
    const dates = Array.from({ length: 7 }, (_, i) => localDate(new Date('2026-11-16T12:00:00Z'), week * 7 + i));
    const { items } = plan({ dates, past, weights: {}, seedBase: 100 + week });
    assert.equal(items.length, 28);
    for (const date of dates) {
      const cats = new Map<string, number>();
      for (const it of items.filter((x) => x.date === date)) cats.set(categoryOf(it.family), (cats.get(categoryOf(it.family)) ?? 0) + 1);
      assert.ok([...cats.values()].every((n) => n <= 2), `category limit broken on ${date}`);
    }
    for (const it of items) {
      const prev = past.filter((p) => p.idea === it.idea).map((p) => p.date).sort().pop();
      if (prev && daysBetween(prev, it.date) < IDEA_GAP_DAYS) gapBreaks++;
      assert.ok(!past.some((p) => p.key === it.key), 'puzzle repeated');
      assert.ok(!items.some((o) => o !== it && o.date === it.date && o.family === it.family), 'same family twice in a day');
      past.push(it);
    }
  }
  // 12 days at 4 posts a day needs 48 ideas. With fewer, some reuse is unavoidable and is reported as a warning.
  if (ideas.size >= 48) assert.equal(gapBreaks, 0);
  console.log(`ideas available: ${ideas.size}, early reuses in 8 weeks: ${gapBreaks}`);
});

test('wording: accepts a faithful rewrite, rejects changed numbers and wrong structure', () => {
  const fam = families['freefall'];
  const p = fam.generate(3);
  const lines = fam.narrate(p);
  const good = { lines: lines.map((l) => l.text.replace('Which one', 'So which one')), title: 'Which marble lands first?', tags: ['gravity'] };
  assert.equal(validate(p, lines, good)?.source, 'llm');
  const wrongNumber = { ...good, lines: good.lines.map((t, i) => (i === 0 ? t.replace(/\d+/, '999') : t)) };
  assert.equal(validate(p, lines, wrongNumber), null);
  assert.equal(validate(p, lines, { ...good, lines: good.lines.slice(1) }), null);
  assert.ok(!validate(p, lines, { ...good, title: '99% of people fail this' })!.title.includes('99'));
  assert.equal(templateWording(p, lines).source, 'template');
});
