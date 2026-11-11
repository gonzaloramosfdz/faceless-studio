import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectile } from './index';

/** Independent check: step a ball forward in small time slices until it reaches the ground. */
function simulate(speed: number, angleDeg: number, y0: number, g: number) {
  const dt = 1e-4;
  const a = (angleDeg * Math.PI) / 180;
  let x = 0, y = y0, vx = Math.abs(Math.cos(a)) < 1e-9 ? 0 : speed * Math.cos(a), vy = speed * Math.sin(a), t = 0;
  while (y > 0 || vy > 0) {
    vy -= g * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }
  return { x, t, speed: Math.hypot(vx, vy) };
}

test('300 seeds: the marked answer agrees with a step-by-step simulation', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = projectile.generate(seed);
    const { variant, speed, g, shots, height } = p.params;
    const sims = shots.map((s) => simulate(speed, s.angle, s.y0, g));
    shots.forEach((s, i) => {
      assert.ok(Math.abs(s.range - sims[i].x) < 0.02, `range off for seed ${seed}`);
      assert.ok(Math.abs(s.flight - sims[i].t) < 0.01, `flight off for seed ${seed}`);
      assert.ok(Math.abs(s.landSpeed - sims[i].speed) < 0.02, `speed off for seed ${seed}`);
    });
    const right = p.options![p.answerIndex!];
    assert.equal(p.answer, right);
    const letter = (x: number[]) => `Ball ${shots[x.indexOf(Math.max(...x))].label}`;
    const tie = (x: number[], tol: number) => Math.max(...x) - Math.min(...x) < tol;
    if (variant === 'best-angle') {
      assert.equal(shots.length, 3);
      assert.ok(shots.some((s) => s.angle === 45));
      assert.equal(right, letter(sims.map((s) => s.x)));
      assert.equal(shots[p.answerIndex!].angle, 45);
    } else if (variant === 'pair') {
      assert.equal(shots[0].angle + shots[1].angle, 90);
      assert.ok(tie(sims.map((s) => s.x), 0.05));
      assert.equal(right, 'Same distance');
    } else if (variant === 'hang-time') {
      assert.ok(!tie(sims.map((s) => s.t), 0.01) || shots[0].angle === 45);
      assert.equal(right, letter(sims.map((s) => s.t)));
      assert.equal(shots[right.endsWith('A') ? 0 : 1].angle, Math.max(shots[0].angle, shots[1].angle));
    } else {
      assert.ok(height > 0);
      assert.ok(tie(sims.map((s) => s.speed), 0.02));
      assert.equal(right, 'Same speed');
    }
    assert.equal(new Set(p.options).size, 3);
    assert.equal(p.options!.length, 3);
    const lines = projectile.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.ok(!lines.some((l) => /\bm\/s\b|\d m\b|×|°/.test(l.text)), 'narration must spell out units');
    assert.ok(p.key.startsWith(`projectile:${variant}:`));
    assert.deepEqual(projectile.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 4);
  assert.ok(keys.size > 60, `only ${keys.size} distinct puzzles in 300 seeds`);
});
