import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export interface MotionParams {
  variant: 'round-trip' | 'meeting';
  mover: string;
  distance: number; // km, one way (round-trip) or between the two start points (meeting)
  v1: number;
  v2: number;
  t1: number;
  t2: number;
  result: number;
  /** Equations shown on screen, one per solver step. */
  rows: string[];
}

const num = (x: number) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));
const hours = (t: number) => `${num(t)} ${t === 1 ? 'hour' : 'hours'}`;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

// Speed pairs whose harmonic mean is a whole number, grouped by what could plausibly move that fast.
const ROUND_TRIP: { mover: string; pairs: [number, number][] }[] = [
  { mover: 'car', pairs: [[30, 60], [40, 60], [60, 90], [40, 120], [45, 90], [48, 80], [36, 60], [60, 120]] },
  { mover: 'cyclist', pairs: [[10, 15], [12, 20], [15, 30], [20, 30], [12, 24], [10, 40]] },
  { mover: 'delivery drone', pairs: [[20, 60], [24, 40], [30, 45], [20, 80]] },
];
const MEETING: { mover: string; speeds: number[] }[] = [
  { mover: 'trains', speeds: [60, 70, 80, 90, 100, 110, 120, 140] },
  { mover: 'cyclists', speeds: [12, 15, 18, 20, 24, 25, 30] },
  { mover: 'ships', speeds: [20, 25, 30, 35, 40, 45] },
];

function roundTrip(seed: number, r: ReturnType<typeof rng>): Puzzle<MotionParams> {
  const group = r.pick(ROUND_TRIP);
  let [v1, v2] = r.pick(group.pairs);
  if (r.next() < 0.5) [v1, v2] = [v2, v1];
  const lcm = (v1 * v2) / gcd(v1, v2);
  const distance = lcm * r.pick(lcm >= 120 ? [1] : [1, 2]);
  const t1 = distance / v1;
  const t2 = distance / v2;
  const result = (2 * distance) / (t1 + t2);
  const naive = (v1 + v2) / 2;
  return {
    family: 'motion',
    seed,
    key: `motion:round-trip:${group.mover}:${distance}:${v1}:${v2}`,
    label: 'Speed trap',
    question: `A ${group.mover} travels ${distance} km at ${v1} km/h, then returns the same way at ${v2} km/h. What is its average speed for the whole trip?`,
    answer: `${num(result)} km/h`,
    thinkSeconds: 8,
    stepCount: 5,
    params: {
      variant: 'round-trip',
      mover: group.mover,
      distance,
      v1,
      v2,
      t1,
      t2,
      result,
      rows: [
        `Not (${v1} + ${v2}) ÷ 2 = ${num(naive)}`,
        `Out: ${distance} ÷ ${v1} = ${num(t1)} h`,
        `Back: ${distance} ÷ ${v2} = ${num(t2)} h`,
        `Total: ${2 * distance} km in ${num(t1 + t2)} h`,
        `Average = ${num(result)} km/h`,
      ],
    },
  };
}

function meeting(seed: number, r: ReturnType<typeof rng>): Puzzle<MotionParams> {
  const group = r.pick(MEETING);
  const [v1, v2] = r.shuffle(group.speeds).slice(0, 2);
  const t = r.pick([1.5, 2, 2.5, 3, 4]);
  const distance = (v1 + v2) * t;
  const result = v1 * t;
  return {
    family: 'motion',
    seed,
    key: `motion:meeting:${group.mover}:${distance}:${v1}:${v2}`,
    label: 'Speed trap',
    question: `Two ${group.mover} start ${distance} km apart and head straight toward each other, one at ${v1} km/h and the other at ${v2} km/h. How far has the first one gone when they meet?`,
    answer: `${num(result)} km`,
    thinkSeconds: 8,
    stepCount: 3,
    params: {
      variant: 'meeting',
      mover: group.mover,
      distance,
      v1,
      v2,
      t1: t,
      t2: t,
      result,
      rows: [
        `Gap closes at ${v1} + ${v2} = ${v1 + v2} km/h`,
        `Time: ${distance} ÷ ${v1 + v2} = ${num(t)} h`,
        `First: ${v1} × ${num(t)} = ${num(result)} km`,
      ],
    },
  };
}

function generate(seed: number): Puzzle<MotionParams> {
  const r = rng(seed);
  return r.next() < 0.5 ? roundTrip(seed, r) : meeting(seed, r);
}

function narrate(p: Puzzle<MotionParams>): Line[] {
  const { variant, mover, distance, v1, v2, t1, t2, result } = p.params;
  if (variant === 'round-trip') {
    return [
      { id: 'h1', kind: 'hook', text: `A ${mover} travels ${distance} kilometers at ${v1} kilometers per hour, then comes back the same way at ${v2}.` },
      { id: 'h2', kind: 'hook', text: 'What is its average speed for the whole trip? Careful, the obvious answer is wrong.' },
      { id: 's0', kind: 'step', step: 0, text: `The tempting answer is halfway between the two speeds, ${num((v1 + v2) / 2)}. But the ${mover} spends more time at the slower speed, so that leg counts for more.` },
      { id: 's1', kind: 'step', step: 1, text: `Going out takes ${distance} divided by ${v1}, which is ${hours(t1)}.` },
      { id: 's2', kind: 'step', step: 2, text: `Coming back takes ${distance} divided by ${v2}, which is ${hours(t2)}.` },
      { id: 's3', kind: 'step', step: 3, text: `That is ${2 * distance} kilometers in ${hours(t1 + t2)}.` },
      { id: 's4', kind: 'step', step: 4, text: `So the average speed is ${num(result)} kilometers per hour, not ${num((v1 + v2) / 2)}.` },
      { id: 'f1', kind: 'final', text: 'Average speed is total distance over total time. Follow for a new puzzle every day.' },
    ];
  }
  return [
    { id: 'h1', kind: 'hook', text: `Two ${mover} start ${distance} kilometers apart and head straight toward each other.` },
    { id: 'h2', kind: 'hook', text: `One moves at ${v1} kilometers per hour, the other at ${v2}. How far has the first one gone when they meet?` },
    { id: 's0', kind: 'step', step: 0, text: `Forget the two separate trips. Together they close the gap at ${v1} plus ${v2}, which is ${v1 + v2} kilometers per hour.` },
    { id: 's1', kind: 'step', step: 1, text: `So they meet after ${distance} divided by ${v1 + v2}, which is ${hours(t1)}.` },
    { id: 's2', kind: 'step', step: 2, text: `In that time the first one covers ${v1} times ${num(t1)}, which is ${num(result)} kilometers.` },
    { id: 'f1', kind: 'final', text: 'When two things move toward each other, add their speeds. Follow for a new puzzle every day.' },
  ];
}

export const motion: Family<MotionParams> = { id: 'motion', generate, narrate };
