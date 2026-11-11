import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freefall } from './index';

/** Independent check: step the motion forward in tiny time slices until the object reaches the ground. */
function simulate(height: number, g: number) {
  const dt = 1e-4;
  let y = height, v = 0, t = 0;
  while (y > 0) {
    v += g * dt;
    y -= v * dt;
    t += dt;
  }
  return t;
}

test('300 seeds: the marked answer agrees with a step-by-step simulation', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = freefall.generate(seed);
    const { bodies, g, variant } = p.params;
    const [ta, tb] = bodies.map((b) => simulate(b.height, g));
    bodies.forEach((b, i) => assert.ok(Math.abs(b.lands - [ta, tb][i]) < 0.01, `landing time off for seed ${seed}`));
    const right = p.options![p.answerIndex!];
    if (variant === 'higher') {
      assert.equal(right, `${Math.round(tb / ta)}× longer`);
      assert.equal(p.options!.filter((o) => o === right).length, 1);
    } else {
      assert.ok(Math.abs(ta - tb) < 0.01);
      assert.equal(right, 'Same time');
    }
    assert.equal(p.answer, right);
    const lines = freefall.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.ok(!lines.some((l) => /\bm\/s\b|\d m\b|×/.test(l.text)), 'narration must spell out units');
    assert.deepEqual(freefall.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 3);
  assert.ok(keys.size > 60, `only ${keys.size} distinct puzzles in 300 seeds`);
});
