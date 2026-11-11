import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export interface CollisionParams {
  variant: 'cradle' | 'equal' | 'sticky' | 'heavy-light';
  fact: string;
  /** cradle */
  total?: number;
  n?: number;
  outCount?: number;
  angle?: number;
  /** equal, sticky, heavy-light: mass of ball/cart 1 (moving) and 2 (at rest) in kg, speed in m/s */
  m1?: number;
  m2?: number;
  v?: number;
  /** speeds after the collision (m/s); for sticky both are the shared speed */
  v1After?: number;
  v2After?: number;
  thing?: string;
}

const num = (x: number) => String(Math.round(x * 10) / 10);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Head-on elastic collision of two bodies. */
export function elasticPair(m1: number, v1: number, m2: number, v2: number): [number, number] {
  const M = m1 + m2;
  return [((m1 - m2) * v1 + 2 * m2 * v2) / M, ((m2 - m1) * v2 + 2 * m1 * v1) / M];
}

/**
 * Balls in contact on a line, left to right. Collisions are resolved one pair at a time
 * (rightmost approaching pair first), which is the usual ideal model of a Newton's cradle.
 */
export function settleChain(masses: number[], speeds: number[]): number[] {
  const v = [...speeds];
  for (let guard = 0; guard < 10000; guard++) {
    let i = v.length - 2;
    while (i >= 0 && !(v[i] > v[i + 1] + 1e-12)) i--;
    if (i < 0) return v;
    const [a, b] = elasticPair(masses[i], v[i], masses[i + 1], v[i + 1]);
    v[i] = a;
    v[i + 1] = b;
  }
  throw new Error('chain did not settle');
}

const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const WORD: Record<number, string> = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six' };

function cradle(seed: number, r: ReturnType<typeof rng>): Puzzle<CollisionParams> {
  const total = r.pick([5, 6]);
  const n = r.int(1, 3);
  const angle = r.pick([25, 30, 35, 40]);
  const speeds = Array.from({ length: total }, (_, i) => (i < n ? 1 : 0));
  const final = settleChain(Array(total).fill(1), speeds);
  const outCount = final.filter((x) => x > 1e-9).length;
  const choices = r.shuffle([1, 2, 3, 4].filter((x) => x !== outCount)).slice(0, 2);
  const options = r.shuffle([outCount, ...choices]).map((k) => `${k} ${k === 1 ? 'ball' : 'balls'}`);
  const answer = `${outCount} ${outCount === 1 ? 'ball' : 'balls'}`;
  return {
    family: 'collision',
    seed,
    key: `collision:cradle:${total}:${n}:${angle}:${options.join('|')}`,
    label: 'How many swing out?',
    question: `${total} identical steel balls hang in a row, touching. ${n} ${n === 1 ? 'ball is' : 'balls are'} pulled back and released. Perfectly elastic collisions, no friction. How many balls swing out on the other side?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'cradle', fact: `${n} in, ${outCount} out`, total, n, outCount, angle },
  };
}

function equal(seed: number, r: ReturnType<typeof rng>): Puzzle<CollisionParams> {
  const thing = r.pick(['ball', 'puck', 'marble']);
  const m = r.pick([0.2, 0.5, 1, 2]);
  const v = r.pick([2, 3, 4, 5, 6, 8]);
  const [v1, v2] = elasticPair(m, v, m, 0);
  const answer = Math.abs(v1) < 1e-9 ? 'Stops dead' : v1 > 0 ? 'Slows, keeps going' : 'Bounces back';
  const options = r.shuffle(['Stops dead', 'Slows, keeps going', 'Bounces back']);
  return {
    family: 'collision',
    seed,
    key: `collision:equal:${thing}:${m}:${v}:${options.join('|')}`,
    label: 'What happens next?',
    question: `A ${m} kg ${thing} moving at ${v} m/s hits an identical ${thing} at rest, head-on. Perfectly elastic, frictionless track. What does the first ${thing} do?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'equal', fact: 'Equal masses swap velocities', m1: m, m2: m, v, v1After: v1, v2After: v2, thing },
  };
}

const RATIOS: [number, number][] = [[1, 1], [1, 2], [2, 1], [1, 3], [3, 1]];
const FRAC: Record<string, string> = { '1/2': 'one half', '1/3': 'one third', '2/3': 'two thirds', '1/4': 'one quarter', '3/4': 'three quarters' };

function sticky(seed: number, r: ReturnType<typeof rng>): Puzzle<CollisionParams> {
  const [a, b] = r.pick(RATIOS);
  const k = r.pick([1, 2]);
  const m1 = a * k;
  const m2 = b * k;
  const v = r.pick([12, 24, 36]);
  const vAfter = (m1 * v) / (m1 + m2);
  const fracs: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 1]];
  const vals = fracs.map(([x, y]) => (x * v) / y).filter((x) => Math.abs(x - vAfter) > 1e-9);
  const wrong = r.shuffle(vals).slice(0, 2);
  const options = r.shuffle([vAfter, ...wrong]).map((x) => `${num(x)} m/s`);
  const answer = `${num(vAfter)} m/s`;
  return {
    family: 'collision',
    seed,
    key: `collision:sticky:${m1}:${m2}:${v}:${options.join('|')}`,
    label: 'How fast after?',
    question: `Cart A (${m1} kg) rolls at ${v} m/s into cart B (${m2} kg) at rest. They stick together. Frictionless track. How fast do they move after?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'sticky', fact: 'Momentum kept, mass shared', m1, m2, v, v1After: vAfter, v2After: vAfter },
  };
}

function heavyLight(seed: number, r: ReturnType<typeof rng>): Puzzle<CollisionParams> {
  const ratio = r.pick([10, 20, 30, 50, 100]);
  const m2 = r.pick([0.1, 0.2, 0.5]);
  const m1 = Math.round(m2 * ratio * 100) / 100;
  const v = r.pick([2, 3, 4, 5, 6]);
  const [v1, v2] = elasticPair(m1, v, m2, 0);
  const factor = v2 / v;
  const cands: [string, number][] = [['Same speed', 1], ['About double', 2], ['About 4 times', 4]];
  const best = cands.reduce((m, c) => (Math.abs(c[1] - factor) < Math.abs(m[1] - factor) ? c : m));
  const options = r.shuffle(cands.map((c) => c[0]));
  return {
    family: 'collision',
    seed,
    key: `collision:heavy-light:${m1}:${m2}:${v}:${options.join('|')}`,
    label: 'How fast does it leave?',
    question: `A heavy ball (${m1} kg) moving at ${v} m/s hits a light ball (${m2} kg) at rest, head-on. Perfectly elastic, frictionless track. How fast does the light ball leave?`,
    options,
    answerIndex: options.indexOf(best[0]),
    answer: best[0],
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'heavy-light', fact: `Light ball leaves at ${num(v2)} m/s`, m1, m2, v, v1After: v1, v2After: v2 },
  };
}

function generate(seed: number): Puzzle<CollisionParams> {
  const r = rng(seed);
  return r.pick([cradle, equal, sticky, heavyLight])(seed, r);
}

function narrate(p: Puzzle<CollisionParams>): Line[] {
  const q = p.params;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const end = 'Follow for a new puzzle every day.';
  if (q.variant === 'cradle') {
    const n = q.n!;
    const out = q.outCount!;
    return [
      { id: 'h1', kind: 'hook', text: `${cap(WORD[q.total!])} identical steel balls hang in a row, touching. ${cap(WORD[n])} ${n === 1 ? 'ball is' : 'balls are'} pulled back and released. The collisions are perfectly elastic.` },
      { id: 'h2', kind: 'hook', text: 'How many balls swing out on the other side?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `${cap(WORD[out])} ${out === 1 ? 'ball swings' : 'balls swing'} out, the same number that went in.` },
      { id: 's2', kind: 'step', step: 2, text: 'Equal balls swap speeds when they collide. So each hit passes the motion down the row, and the balls at the end leave with exactly the speed of the ones that arrived.' },
      { id: 'f1', kind: 'final', text: `Same number in, same number out. ${end}` },
    ];
  }
  if (q.variant === 'equal') {
    const t = q.thing!;
    return [
      { id: 'h1', kind: 'hook', text: `A ${t} moving at ${q.v} meters per second hits an identical ${t} that is sitting still, head-on. The collision is perfectly elastic.` },
      { id: 'h2', kind: 'hook', text: `What does the first ${t} do afterward?` },
      run,
      { id: 's1', kind: 'step', step: 1, text: `It stops dead. The second ${t} leaves at ${q.v} meters per second.` },
      { id: 's2', kind: 'step', step: 2, text: 'The total motion and the total energy must both stay the same. For two identical balls, the only way to do that is for them to swap speeds.' },
      { id: 'f1', kind: 'final', text: `Identical balls trade velocities in a head-on elastic hit. ${end}` },
    ];
  }
  if (q.variant === 'sticky') {
    const d = gcd(q.m1!, q.m1! + q.m2!);
    const fn = q.m1! / d;
    const fd = (q.m1! + q.m2!) / d;
    const word = FRAC[`${fn}/${fd}`];
    return [
      { id: 'h1', kind: 'hook', text: `A ${q.m1} kilogram cart rolls at ${q.v} meters per second into a ${q.m2} kilogram cart at rest. They stick together. The track has no friction.` },
      { id: 'h2', kind: 'hook', text: 'How fast do they move afterward?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `${num(q.v1After!)} meters per second. That is ${word} of the original speed.` },
      { id: 's2', kind: 'step', step: 2, text: 'The total motion is kept, but now it is shared by more mass. So the speed drops by the same factor that the mass grows.' },
      { id: 'f1', kind: 'final', text: `When carts stick, the speed shrinks as the mass grows. ${end}` },
    ];
  }
  return [
    { id: 'h1', kind: 'hook', text: `A heavy ball, ${Math.round(q.m1! / q.m2!)} times heavier than a light ball, rolls at ${q.v} meters per second and hits the light ball at rest. The collision is perfectly elastic.` },
    { id: 'h2', kind: 'hook', text: 'How fast does the light ball shoot away?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `About double. It leaves at ${num(q.v2After!)} meters per second, and the heavy ball barely slows down.` },
    { id: 's2', kind: 'step', step: 2, text: 'In a perfectly elastic hit, the balls separate at the same speed they approached. The heavy ball barely slows down, so the light ball must leave about one full speed faster than it.' },
    { id: 'f1', kind: 'final', text: `A heavy ball can launch a light one at nearly twice its own speed. ${end}` },
  ];
}

export const collision: Family<CollisionParams> = { id: 'collision', generate, narrate };
