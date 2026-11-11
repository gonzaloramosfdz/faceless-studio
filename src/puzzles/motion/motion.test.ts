import { test } from 'node:test';
import assert from 'node:assert/strict';
import { motion } from './index';

test('300 seeds: answers match an independent calculation and stay tidy', () => {
  const keys = new Set<string>();
  const variants = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = motion.generate(seed);
    const { variant, distance, v1, v2, result, rows } = p.params;
    assert.notEqual(v1, v2);
    if (variant === 'round-trip') {
      // Harmonic mean, computed a different way from the generator.
      assert.ok(Math.abs(result - (2 * v1 * v2) / (v1 + v2)) < 1e-9);
      assert.ok(Number.isInteger(result), `untidy average ${result}`);
      assert.notEqual(result, (v1 + v2) / 2);
    } else {
      // Positions are equal at the meeting time.
      const t = result / v1;
      assert.ok(Math.abs(v1 * t + v2 * t - distance) < 1e-9);
      assert.ok(Number.isInteger(result * 2), `untidy distance ${result}`);
    }
    const lines = motion.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.equal(rows.length, p.stepCount);
    assert.ok(!lines.some((l) => /km|\d\.\d{3}/.test(l.text)), 'narration must spell out units');
    assert.deepEqual(motion.generate(seed), p);
    keys.add(p.key);
    variants.add(variant);
  }
  assert.equal(variants.size, 2);
  assert.ok(keys.size > 120, `only ${keys.size} distinct puzzles in 300 seeds`);
});
