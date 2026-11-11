import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pendulum } from './index';

/** Independent check: integrate theta'' = -(g/L) sin(theta) with velocity Verlet and time the first zero crossing (a quarter period). */
function simulatePeriod(length: number, g: number, ampDeg: number) {
  const dt = 1e-5;
  let th = (ampDeg * Math.PI) / 180, om = 0, t = 0;
  let acc = -(g / length) * Math.sin(th);
  while (th > 0) {
    om += 0.5 * acc * dt;
    th += om * dt;
    acc = -(g / length) * Math.sin(th);
    om += 0.5 * acc * dt;
    t += dt;
  }
  return 4 * t;
}

test('300 seeds: the marked answer agrees with a pendulum simulation', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = pendulum.generate(seed);
    const { variant, pends, amp, periods } = p.params;
    const [ta, tb] = pends.map((q) => simulatePeriod(q.length, q.g, amp));
    [ta, tb].forEach((t, i) => assert.ok(Math.abs(t - periods[i]) < 0.01 * t, `period off for seed ${seed}: ${t} vs ${periods[i]}`));
    const right = p.options![p.answerIndex!];
    assert.equal(p.answer, right);
    assert.equal(p.options!.length, 3);
    assert.equal(new Set(p.options).size, 3);
    assert.ok(amp <= 12);
    if (variant === 'mass') {
      assert.ok(Math.abs(ta - tb) < 0.005 * ta);
      assert.equal(right, 'Same');
    } else if (variant === 'length') {
      assert.equal(right, ta < tb ? 'A faster' : 'B faster');
    } else if (variant === 'moon') {
      assert.equal(right, 'On the Moon');
      const slower = ta > tb ? 0 : 1;
      assert.equal(pends[slower].place, 'Moon');
    } else {
      assert.equal(right, `${Math.round(Math.max(ta, tb) / Math.min(ta, tb))} times longer`);
      assert.equal(p.options!.filter((o) => o === right).length, 1);
    }
    assert.ok(p.key.startsWith(`pendulum:${variant}:`));
    assert.ok([6, 7, 8].includes(p.thinkSeconds!));
    const lines = pendulum.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.ok(!lines.some((l) => /\bm\/s\b|\d\s?(m|s|kg)\b|×|√|°/.test(l.text)), 'narration must spell out units');
    assert.ok(lines[5].text.endsWith('Follow for a new puzzle every day.'));
    assert.deepEqual(pendulum.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 4);
  assert.ok(keys.size > 150, `only ${keys.size} distinct puzzles in 300 seeds`);
});
