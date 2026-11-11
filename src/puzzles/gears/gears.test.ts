import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gears } from './index';

/** Independent: push the first gear one tooth at a time; every tooth that passes moves one tooth on the next gear, reversed. */
function stepChain(teeth: number[]) {
  const moved = teeth.map(() => 0);
  for (let s = 0; s < teeth[0]; s++) {
    let dir = 1;
    moved[0] += 1;
    for (let j = 1; j < teeth.length; j++) {
      dir = -dir;
      moved[j] += dir;
    }
  }
  return moved.map((m, j) => m / teeth[j]); // signed turns, positive = clockwise
}

test('300 seeds: the marked answer agrees with tooth-by-tooth stepping', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = gears.generate(seed);
    const { variant, rigs } = p.params;
    const g = rigs[0].gears;
    const right = p.options![p.answerIndex!];
    assert.equal(p.answer, right);
    if (variant === 'direction') {
      const turns = stepChain(g.map((x) => x.teeth));
      assert.equal(right, turns[turns.length - 1] > 0 ? 'Clockwise' : 'Counter-clockwise');
      assert.ok(g.length >= 3 && g.length <= 6);
      turns.forEach((t, i) => assert.ok(Math.abs(t - g[i].omega) < 1e-9));
    } else if (variant === 'speed') {
      const turns = stepChain(g.map((x) => x.teeth));
      const frac = Math.abs(turns[1]);
      const [n, d] = p.params.ratio!;
      assert.ok(Math.abs(frac - n / d) < 1e-9);
      assert.ok(Math.abs(Math.abs(g[1].omega) - frac) < 1e-9);
      const text = d === 1 ? `${n} ${n === 1 ? 'turn' : 'turns'}` : n > d ? `${Math.floor(n / d)} ${n % d}/${d} turns` : `${n}/${d} turn`;
      assert.equal(right, text);
    } else if (variant === 'idler') {
      const withMid = Math.abs(stepChain(g.map((x) => x.teeth))[2]);
      const direct = Math.abs(stepChain([g[0].teeth, g[2].teeth])[1]);
      assert.ok(Math.abs(withMid - direct) < 1e-9);
      assert.equal(right, 'Same speed');
      assert.equal(rigs.length, 2);
      assert.ok(g[1].teeth !== undefined);
    } else {
      // Two-colour the ring by hand: an odd ring cannot alternate.
      const jam = g.length % 2 === 1;
      assert.equal(right, jam ? 'They jam' : 'They all turn');
      assert.equal(rigs[0].links.length, g.length);
    }
    // Meshed gears must interlock: pitch-circle tooth points of neighbours never coincide.
    for (const rig of rigs) {
      for (const [u, v] of rig.links) {
        if (rig.jam && u === rig.jam[0] && v === rig.jam[1]) continue;
        const gu = rig.gears[u], gv = rig.gears[v];
        const ru = gu.teeth / 2, rv = gv.teeth / 2;
        assert.ok(Math.abs(Math.hypot(gu.x - gv.x, gu.y - gv.y) - (ru + rv)) < 1e-9, 'gears must touch');
        let min = Infinity;
        for (let i = 0; i < gu.teeth; i++) {
          const a = gu.phase + (2 * Math.PI * i) / gu.teeth;
          const pa = [gu.x + ru * Math.cos(a), gu.y + ru * Math.sin(a)];
          for (let j = 0; j < gv.teeth; j++) {
            const b = gv.phase + (2 * Math.PI * j) / gv.teeth;
            const pb = [gv.x + rv * Math.cos(b), gv.y + rv * Math.sin(b)];
            min = Math.min(min, Math.hypot(pa[0] - pb[0], pa[1] - pb[1]));
          }
        }
        assert.ok(min > 1.4, `teeth collide in seed ${seed} (${min})`);
      }
    }
    assert.equal(new Set(p.options).size, 3);
    assert.equal(p.options!.length, 3);
    assert.ok(p.thinkSeconds! >= 6 && p.thinkSeconds! <= 8);
    const lines = gears.narrate(p);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.equal(p.stepCount, 3);
    assert.ok(lines[5].text.endsWith('Follow for a new puzzle every day.'));
    assert.ok(!lines.some((l) => /\b(kg|km|cm|mm)\b|\d ?m\b|×|\d\/\d/.test(l.text)), 'narration must spell out units');
    assert.ok(/^gears:[a-z]+:/.test(p.key));
    assert.deepEqual(gears.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 4);
  assert.ok(keys.size > 100, `only ${keys.size} distinct puzzles in 300 seeds`);
});
