import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seesaw } from './index';

test('300 seeds: the marked answer agrees with an independent torque sum', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  let balanced = 0;
  let whichBalanced = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const p = seesaw.generate(seed);
    const { variant, weights, plank, a, b } = p.params;
    // Independent: moment about the pivot, positive = clockwise (right side down).
    let moment = 0;
    for (const w of weights) moment += w.kg * w.x;
    if (plank) {
      const middle = (b - a) / 2; // plank spans -a..b, so its middle is here
      assert.equal(plank.x, middle);
      moment += plank.kg * middle;
    }
    assert.ok(Math.abs(p.params.net - moment) < 1e-9);
    const right = p.options![p.answerIndex!];
    assert.equal(p.answer, right);
    if (variant === 'where-to-sit') {
      assert.equal(weights.length, 2);
      assert.equal(moment, 0, `seed ${seed} not balanced`);
      assert.equal(right, `${Math.abs(weights[1].x)} m`);
      assert.ok(weights[0].kg !== weights[1].kg);
      assert.equal(Math.sign(weights[0].x), -Math.sign(weights[1].x));
    } else {
      assert.equal(right, moment === 0 ? 'Balanced' : moment > 0 ? 'Right down' : 'Left down');
      if (moment === 0) balanced++;
      if (moment === 0 && variant === 'which-side') whichBalanced++;
    }
    assert.equal(new Set(p.options).size, 3);
    assert.equal(p.options!.length, 3);
    assert.ok(p.thinkSeconds! >= 6 && p.thinkSeconds! <= 8);
    // every weight stays on the beam
    for (const w of weights) assert.ok(w.x > -a && w.x < b);
    const lines = seesaw.narrate(p);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.equal(p.stepCount, 3);
    assert.ok(lines[5].text.endsWith('Follow for a new puzzle every day.'));
    assert.ok(!lines.some((l) => /\b(kg|km|cm|mm)\b|\d ?m\b|×|\//.test(l.text)), 'narration must spell out units');
    assert.ok(/^seesaw:[a-z-]+:/.test(p.key));
    assert.deepEqual(seesaw.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 3);
  assert.ok(whichBalanced >= 15, `only ${whichBalanced} balanced which-side puzzles`);
  assert.ok(balanced >= 25);
  assert.ok(keys.size > 100, `only ${keys.size} distinct puzzles in 300 seeds`);
});
