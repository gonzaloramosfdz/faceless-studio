import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rampRace } from './index';

const rad = (d: number) => (d * Math.PI) / 180;

/** Slide on y(x) using energy conservation only: speed from the height lost, step along the track. */
function slideTime(H: number, E: number, L: number, d: number, g: number) {
  const y = (x: number) => H + ((E - H) * x) / L - d * Math.sin((Math.PI * x) / L) ** 2;
  const dt = 1e-5;
  let x = 1e-7, t = 0;
  while (x < L) {
    const h = 1e-6;
    const slope = (y(x + h) - y(x - h)) / (2 * h);
    const v = Math.sqrt(2 * g * Math.max(H - y(x), 0));
    x += (v * dt) / Math.sqrt(1 + slope * slope);
    t += dt;
  }
  return t;
}

/** Rolling without slipping from forces: friction f makes torque, a = alpha * r. Moment of inertia from the shape. */
function rollTime(shape: string, m: number, r: number, theta: number, length: number, g: number) {
  const I = { 'solid cylinder': 0.5, 'hollow cylinder': 1, 'solid sphere': 0.4, 'hollow sphere': 2 / 3 }[shape]! * m * r * r;
  const dt = 1e-4;
  let s = 0, v = 0, t = 0;
  while (s < length) {
    // m a = m g sin(theta) - f ; I (a / r) = f r  =>  f = I a / r^2
    const a = (m * g * Math.sin(rad(theta))) / (m + I / (r * r));
    v += a * dt;
    s += v * dt;
    t += dt;
  }
  return t;
}

function slideDown(angle: number, h: number, g: number) {
  const len = h / Math.sin(rad(angle));
  const dt = 1e-5;
  let s = 0, v = 0, t = 0;
  while (s < len) {
    v += g * Math.sin(rad(angle)) * dt;
    s += v * dt;
    t += dt;
  }
  return { t, v };
}

test('300 seeds: the marked answer agrees with independent simulations', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  const options = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = rampRace.generate(seed);
    const { variant, g, lands } = p.params;
    let ta: number, tb: number, ai: number;
    if (variant === 'dip') {
      const { track, dipIsA } = p.params.dip!;
      const dipT = slideTime(track.H, track.E, track.L, track.d, g);
      const strT = slideTime(track.H, track.E, track.L, 0, g);
      assert.ok(Math.abs(dipT - strT) > 0.03 * strT, `dip margin too small, seed ${seed}`);
      [ta, tb] = dipIsA ? [dipT, strT] : [strT, dipT];
      ai = ta < tb ? 0 : 1;
      const minY = Math.min(...Array.from({ length: 200 }, (_, i) => track.H + ((track.E - track.H) * i) / 199 - track.d * Math.sin((Math.PI * i) / 199) ** 2));
      assert.ok(minY > 0.02, 'track dips below the ground');
    } else if (variant === 'rolling') {
      const { theta, length, balls } = p.params.rolling!;
      [ta, tb] = balls.map((b) => rollTime(b.shape, b.mass, b.radius, theta, length, g));
      ai = Math.abs(ta - tb) < 0.01 * ta ? 2 : ta < tb ? 0 : 1;
    } else {
      const { angles, height, speed } = p.params.ramps!;
      const [ra, rb] = angles.map((a) => slideDown(a, height, g));
      ta = ra.t;
      tb = rb.t;
      assert.ok(Math.abs(ra.v - rb.v) < 0.01 * ra.v);
      assert.ok(Math.abs(ra.v - speed) < 0.02 * speed);
      ai = 2;
    }
    [ta, tb].forEach((t, i) => assert.ok(Math.abs(t - lands[i]) < 0.02 * t + 0.01, `${variant} time off for seed ${seed}: ${t} vs ${lands[i]}`));
    assert.equal(p.answerIndex, ai, `wrong answer for seed ${seed} (${p.key})`);
    assert.equal(p.answer, p.options![ai]);
    assert.equal(p.options!.length, 3);
    assert.ok(p.key.startsWith(`ramp-race:${variant}:`));
    assert.ok([6, 7, 8].includes(p.thinkSeconds!));
    const lines = rampRace.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.deepEqual(lines.map((l) => l.id), ['h1', 'h2', 's0', 's1', 's2', 'f1']);
    assert.ok(!lines.some((l) => /\bm\/s\b|\d\s?(m|s|kg)\b|×|°/.test(l.text)), 'narration must spell out units');
    assert.ok(lines[5].text.endsWith('Follow for a new puzzle every day.'));
    assert.deepEqual(rampRace.generate(seed), p);
    variants.add(variant);
    keys.add(p.key);
    options.add(`${variant}:${p.answer}`);
  }
  assert.equal(variants.size, 3);
  assert.ok(keys.size > 100, `only ${keys.size} distinct puzzles in 300 seeds`);
  assert.ok(options.size >= 6, 'answers should vary');
});
