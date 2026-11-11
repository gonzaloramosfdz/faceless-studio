import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export type Label = 'A' | 'B' | 'C';

/** One launched ball. Metres, seconds, m/s, degrees. Launch point is x = 0, height y0. */
export interface Shot {
  label: Label;
  angle: number;
  vx: number;
  vy: number;
  y0: number;
  flight: number;
  range: number;
  apex: number;
  landSpeed: number;
}
export interface ProjectileParams {
  variant: 'best-angle' | 'pair' | 'hang-time' | 'cliff';
  g: number;
  speed: number;
  height: number;
  shots: Shot[];
  fact: string;
}

export const G = 9.8;
const rad = (d: number) => (d * Math.PI) / 180;
const num = (x: number) => String(Math.round(x * 10) / 10);
const secs = (t: number) => `${num(t)} ${num(t) === '1' ? 'second' : 'seconds'}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function makeShot(label: Label, speed: number, angle: number, y0: number, g = G): Shot {
  const c = Math.cos(rad(angle));
  const vx = Math.abs(c) < 1e-9 ? 0 : speed * c;
  const vy = speed * Math.sin(rad(angle));
  const flight = (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g;
  const vEnd = vy - g * flight;
  return {
    label,
    angle,
    vx,
    vy,
    y0,
    flight,
    range: vx * flight,
    apex: y0 + (vy > 0 ? (vy * vy) / (2 * g) : 0),
    landSpeed: Math.sqrt(vx * vx + vEnd * vEnd),
  };
}

/** Position of a shot at time t (clamped at landing). */
export function shotPos(s: Shot, t: number, g = G) {
  const tt = Math.min(Math.max(t, 0), s.flight);
  return { x: s.vx * tt, y: Math.max(0, s.y0 + s.vy * tt - 0.5 * g * tt * tt) };
}

const LABELS: Label[] = ['A', 'B', 'C'];
const argmax = (xs: number[]) => xs.indexOf(Math.max(...xs));

function bestAngle(seed: number, r: ReturnType<typeof rng>): Puzzle<ProjectileParams> {
  const speed = r.pick([10, 15, 20, 25, 30]);
  const pool = [15, 20, 25, 30, 35, 55, 60, 65, 70, 75];
  let others: number[];
  do {
    others = [r.pick(pool), r.pick(pool)];
  } while (Math.abs(others[0] - others[1]) < 10);
  const angles = r.shuffle([45, ...others]);
  const shots = angles.map((a, i) => makeShot(LABELS[i], speed, a, 0));
  const best = argmax(shots.map((s) => s.range));
  const options = LABELS.map((l) => `Ball ${l}`);
  return {
    family: 'projectile',
    seed,
    key: `projectile:best-angle:${speed}:${angles.join('-')}`,
    label: 'Which goes farthest?',
    question: `Three balls are launched from level ground at ${speed} m/s: ${shots.map((s) => `${s.label} at ${s.angle}°`).join(', ')}. No air resistance. Which lands farthest away?`,
    options,
    answerIndex: best,
    answer: options[best],
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'best-angle', g: G, speed, height: 0, shots, fact: '45° gives the longest range' },
  };
}

function pairShots(r: ReturnType<typeof rng>, speed: number) {
  const low = r.pick([15, 20, 25, 30, 35, 40]);
  const angles = r.next() < 0.5 ? [low, 90 - low] : [90 - low, low];
  return angles.map((a, i) => makeShot(LABELS[i], speed, a, 0));
}

function pair(seed: number, r: ReturnType<typeof rng>): Puzzle<ProjectileParams> {
  const speed = r.pick([10, 15, 20, 25, 30]);
  const shots = pairShots(r, speed);
  const same = Math.abs(shots[0].range - shots[1].range) < 1e-6;
  const answer = same ? 'Same distance' : shots[0].range > shots[1].range ? 'Ball A' : 'Ball B';
  const options = r.shuffle(['Ball A', 'Ball B', 'Same distance']);
  return {
    family: 'projectile',
    seed,
    key: `projectile:pair:${speed}:${shots[0].angle}-${shots[1].angle}:${options.join('|')}`,
    label: 'Which lands farther?',
    question: `Two balls are launched from level ground at the same speed, ${speed} m/s: A at ${shots[0].angle}°, B at ${shots[1].angle}°. No air resistance. Which lands farther away?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'pair', g: G, speed, height: 0, shots, fact: 'Angles that add to 90° tie' },
  };
}

function hangTime(seed: number, r: ReturnType<typeof rng>): Puzzle<ProjectileParams> {
  const speed = r.pick([10, 15, 20, 25, 30]);
  const shots = pairShots(r, speed);
  const answer = Math.abs(shots[0].flight - shots[1].flight) < 1e-6 ? 'Same time' : shots[0].flight > shots[1].flight ? 'Ball A' : 'Ball B';
  const options = r.shuffle(['Ball A', 'Ball B', 'Same time']);
  return {
    family: 'projectile',
    seed,
    key: `projectile:hang-time:${speed}:${shots[0].angle}-${shots[1].angle}:${options.join('|')}`,
    label: 'Which stays up longer?',
    question: `Two balls are launched from level ground at the same speed, ${speed} m/s: A at ${shots[0].angle}°, B at ${shots[1].angle}°. No air resistance. Which stays in the air longer?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'hang-time', g: G, speed, height: 0, shots, fact: 'Steeper shot: more air time' },
  };
}

function cliff(seed: number, r: ReturnType<typeof rng>): Puzzle<ProjectileParams> {
  const speed = r.pick([5, 10, 15, 20]);
  const height = r.pick([20, 30, 40, 60]);
  const upFirst = r.next() < 0.5;
  const angles = upFirst ? [90, -90] : [-90, 90];
  const shots = angles.map((a, i) => makeShot(LABELS[i], speed, a, height));
  const sA = shots[0].landSpeed;
  const sB = shots[1].landSpeed;
  const answer = Math.abs(sA - sB) < 1e-6 ? 'Same speed' : sA > sB ? 'Ball A' : 'Ball B';
  const options = r.shuffle(['Ball A', 'Ball B', 'Same speed']);
  const dir = (s: Shot) => (s.angle > 0 ? 'straight up' : 'straight down');
  return {
    family: 'projectile',
    seed,
    key: `projectile:cliff:${speed}:${height}:${upFirst ? 'up-down' : 'down-up'}:${options.join('|')}`,
    label: 'Which hits harder?',
    question: `On a ${height} m cliff, ball A is thrown ${dir(shots[0])} at ${speed} m/s and ball B ${dir(shots[1])} at ${speed} m/s. No air resistance. Which hits the ground at the higher speed?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'cliff', g: G, speed, height, shots, fact: `Both hit at ${num(sA)} m/s` },
  };
}

function generate(seed: number): Puzzle<ProjectileParams> {
  const r = rng(seed);
  return r.pick([bestAngle, pair, hangTime, cliff])(seed, r);
}

function narrate(p: Puzzle<ProjectileParams>): Line[] {
  const { variant, shots, speed, height } = p.params;
  const [a, b] = shots;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const end = 'Follow for a new puzzle every day.';
  if (variant === 'best-angle') {
    const best = shots.reduce((m, s) => (s.range > m.range ? s : m));
    const names = shots.map((s) => `${s.angle}`);
    return [
      { id: 'h1', kind: 'hook', text: `Three balls are launched at the same speed, ${speed} meters per second, at ${names[0]}, ${names[1]} and ${names[2]} degrees. No air resistance.` },
      { id: 'h2', kind: 'hook', text: 'Which one lands farthest away?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Ball ${best.label}, launched at ${best.angle} degrees, goes farthest, about ${Math.round(best.range)} meters.` },
      { id: 's2', kind: 'step', step: 2, text: 'Aiming too low wastes flight time. Aiming too high wastes forward speed. Forty-five degrees balances the two.' },
      { id: 'f1', kind: 'final', text: `On flat ground, forty-five degrees gives the longest throw. ${end}` },
    ];
  }
  if (variant === 'pair') {
    return [
      { id: 'h1', kind: 'hook', text: `Two balls are launched at the same speed, ${speed} meters per second. Ball A goes up at ${a.angle} degrees, ball B at ${b.angle} degrees. No air resistance.` },
      { id: 'h2', kind: 'hook', text: 'Which one lands farther away?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `They land at the same spot, about ${Math.round(a.range)} meters away.` },
      { id: 's2', kind: 'step', step: 2, text: 'The low shot moves forward faster but is in the air for less time. The high shot moves forward slower but stays up longer. Whenever the two angles add up to ninety degrees, these exactly balance.' },
      { id: 'f1', kind: 'final', text: `Two angles that add up to ninety degrees give the same range. ${end}` },
    ];
  }
  if (variant === 'hang-time') {
    const longer = a.flight > b.flight ? a : b;
    const shorter = longer === a ? b : a;
    return [
      { id: 'h1', kind: 'hook', text: `Two balls are launched at the same speed, ${speed} meters per second. Ball A goes up at ${a.angle} degrees, ball B at ${b.angle} degrees. No air resistance.` },
      { id: 'h2', kind: 'hook', text: 'Which one stays in the air longer?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Ball ${longer.label}, the steeper one, stays up ${secs(longer.flight)}, against ${secs(shorter.flight)}.` },
      { id: 's2', kind: 'step', step: 2, text: 'Air time depends only on the upward part of the speed. The steeper launch has more of it, so the ball climbs higher and takes longer to come back down.' },
      { id: 'f1', kind: 'final', text: `Steeper means more hang time, even though the distance can be the same. ${end}` },
    ];
  }
  const up = a.angle > 0 ? a : b;
  return [
    { id: 'h1', kind: 'hook', text: `From the top of a ${height} meter cliff, one ball is thrown straight up and another straight down, both at ${speed} meters per second. No air resistance.` },
    { id: 'h2', kind: 'hook', text: 'Which one hits the ground at the higher speed?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `Same speed. Both hit the ground at about ${Math.round(up.landSpeed)} meters per second.` },
    { id: 's2', kind: 'step', step: 2, text: 'The ball thrown up rises, stops, and falls back past the edge moving downward at its original speed. From there it is identical to the ball thrown down.' },
    { id: 'f1', kind: 'final', text: `The direction of the throw does not change the impact speed. ${end}` },
  ];
}

export const projectile: Family<ProjectileParams> = { id: 'projectile', generate, narrate };
void cap;
