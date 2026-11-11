import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collision } from './index';

/** Independent check: event-driven simulation of balls on a line. Elastic bounce at each contact. */
function simulate(masses: number[], speeds: number[], gap = 1e-3) {
  const r = 0.5;
  const x = masses.map((_, i) => i * (2 * r + gap));
  const v = [...speeds];
  for (let guard = 0; guard < 100000; guard++) {
    let best = Infinity, at = -1;
    for (let i = 0; i + 1 < v.length; i++) {
      const closing = v[i] - v[i + 1];
      if (closing > 1e-12) {
        const t = Math.max(0, (x[i + 1] - x[i] - 2 * r) / closing);
        if (t < best) { best = t; at = i; }
      }
    }
    if (at < 0) return v;
    for (let i = 0; i < x.length; i++) x[i] += v[i] * best;
    const [m1, m2, u1, u2] = [masses[at], masses[at + 1], v[at], v[at + 1]];
    // elastic collision from conservation of momentum and relative speed reversal
    const c = (m1 * u1 + m2 * u2) / (m1 + m2);
    v[at] = c + (m2 / (m1 + m2)) * (u2 - u1);
    v[at + 1] = c + (m1 / (m1 + m2)) * (u1 - u2);
  }
  throw new Error('no settle');
}
const momentum = (m: number[], v: number[]) => m.reduce((s, mi, i) => s + mi * v[i], 0);
const energy = (m: number[], v: number[]) => m.reduce((s, mi, i) => s + 0.5 * mi * v[i] * v[i], 0);

test('300 seeds: the marked answer agrees with an independent simulation', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = collision.generate(seed);
    const q = p.params;
    const right = p.options![p.answerIndex!];
    assert.equal(p.answer, right);
    if (q.variant === 'cradle') {
      const sp = Array.from({ length: q.total! }, (_, i) => (i < q.n! ? 1 : 0));
      const m = Array(q.total!).fill(1);
      const end = simulate(m, sp);
      assert.ok(Math.abs(momentum(m, end) - momentum(m, sp)) < 1e-9);
      assert.ok(Math.abs(energy(m, end) - energy(m, sp)) < 1e-9);
      const out = end.filter((x) => x > 0.5).length;
      assert.equal(out, q.n);
      assert.equal(right, `${out} ${out === 1 ? 'ball' : 'balls'}`);
      assert.ok(end.every((x) => Math.abs(x) < 1e-9 || Math.abs(x - 1) < 1e-9));
    } else if (q.variant === 'equal' || q.variant === 'heavy-light') {
      const m = [q.m1!, q.m2!];
      const end = simulate(m, [q.v!, 0]);
      assert.ok(Math.abs(momentum(m, end) - momentum(m, [q.v!, 0])) < 1e-9);
      assert.ok(Math.abs(energy(m, end) - energy(m, [q.v!, 0])) < 1e-9);
      assert.ok(Math.abs(end[0] - q.v1After!) < 1e-9 && Math.abs(end[1] - q.v2After!) < 1e-9);
      if (q.variant === 'equal') {
        assert.equal(q.m1, q.m2);
        assert.equal(right, Math.abs(end[0]) < 1e-9 ? 'Stops dead' : end[0] > 0 ? 'Slows, keeps going' : 'Bounces back');
        assert.equal(right, 'Stops dead');
        assert.ok(Math.abs(end[1] - q.v!) < 1e-9);
      } else {
        const f = end[1] / q.v!;
        assert.ok(f > 1.8 && f < 2, `factor ${f}`);
        assert.equal(right, 'About double');
        assert.ok(end[0] > 0 && end[0] < q.v!);
      }
    } else {
      const vf = (q.m1! * q.v!) / (q.m1! + q.m2!);
      assert.ok(Math.abs(vf - q.v1After!) < 1e-9);
      // momentum kept; kinetic energy lost is the share m2 / (m1 + m2)
      const ke0 = 0.5 * q.m1! * q.v! ** 2;
      const ke1 = 0.5 * (q.m1! + q.m2!) * vf ** 2;
      assert.ok(Math.abs((ke0 - ke1) / ke0 - q.m2! / (q.m1! + q.m2!)) < 1e-9);
      assert.equal(right, `${Math.round(vf * 10) / 10} m/s`);
      assert.ok(Math.abs(vf - Math.round(vf)) < 1e-9, 'tidy speeds');
    }
    assert.equal(p.options!.length, 3);
    assert.equal(new Set(p.options).size, 3);
    const lines = collision.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.ok(!lines.some((l) => /\bm\/s\b|\d m\b|\bkg\b|×|undefined|NaN/.test(l.text)), 'narration must spell out units');
    assert.ok(p.key.startsWith(`collision:${q.variant}:`));
    assert.deepEqual(collision.generate(seed), p);
    variants.add(q.variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 4);
  assert.ok(keys.size > 60, `only ${keys.size} distinct puzzles in 300 seeds`);
});
