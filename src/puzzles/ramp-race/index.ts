import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export const G = 10;

/** Smooth track from height H (x = 0) to height E (x = L), pulled down by a dip of depth d in the middle. d = 0 is a straight ramp. */
export interface DipTrack {
  H: number;
  E: number;
  L: number;
  d: number;
}
export const trackY = (k: DipTrack, x: number) => k.H + ((k.E - k.H) * x) / k.L - k.d * Math.sin((Math.PI * x) / k.L) ** 2;
export const trackSlope = (k: DipTrack, x: number) => (k.E - k.H) / k.L - ((k.d * Math.PI) / k.L) * Math.sin((2 * Math.PI * x) / k.L);
const trackCurv = (k: DipTrack, x: number) => -((2 * k.d * Math.PI ** 2) / k.L ** 2) * Math.cos((2 * Math.PI * x) / k.L);

/** A bead sliding without friction on the track, integrated step by step (RK4). */
export function slidePath(k: DipTrack, g = G, dt = 0.002) {
  const f = (x: number, u: number): [number, number] => {
    const s = trackSlope(k, x);
    const c = trackCurv(k, x);
    return [u, -(g * s + s * c * u * u) / (1 + s * s)];
  };
  const xs = [0];
  let x = 0;
  let u = 0;
  let time = 0;
  while (xs.length < 200000) {
    const k1 = f(x, u);
    const k2 = f(x + (dt / 2) * k1[0], u + (dt / 2) * k1[1]);
    const k3 = f(x + (dt / 2) * k2[0], u + (dt / 2) * k2[1]);
    const k4 = f(x + dt * k3[0], u + dt * k3[1]);
    const nx = x + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    u += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    if (nx >= k.L) {
      time = (xs.length - 1) * dt + (dt * (k.L - x)) / (nx - x);
      xs.push(k.L);
      break;
    }
    x = nx;
    xs.push(x);
  }
  return { dt, xs, time };
}
export function slideX(path: ReturnType<typeof slidePath>, t: number, L: number) {
  if (t >= path.time) return L;
  const i = Math.floor(t / path.dt);
  const f = t / path.dt - i;
  return path.xs[i] + (path.xs[Math.min(i + 1, path.xs.length - 1)] - path.xs[i]) * f;
}

export const SHAPES = {
  'solid cylinder': { k: 1 / 2, hollow: false, plural: 'solid cylinders' },
  'hollow cylinder': { k: 1, hollow: true, plural: 'hollow cylinders' },
  'solid sphere': { k: 2 / 5, hollow: false, plural: 'solid spheres' },
  'hollow sphere': { k: 2 / 3, hollow: true, plural: 'hollow spheres' },
} as const;
export type ShapeName = keyof typeof SHAPES;

/** A rolling object. k = I / (m r^2) is the moment of inertia in units of m r^2. Mass in kg, radius in m. */
export interface RollBall {
  label: 'A' | 'B';
  shape: ShapeName;
  k: number;
  hollow: boolean;
  mass: number;
  radius: number;
  /** Acceleration along the ramp and arrival time, from the physics below. */
  a: number;
  lands: number;
}

export interface RampParams {
  variant: 'dip' | 'rolling' | 'steep-shallow';
  g: number;
  fact: string;
  /** Arrival times in seconds for A and B. */
  lands: [number, number];
  dip?: { track: DipTrack; dipIsA: boolean };
  rolling?: { theta: number; length: number; balls: [RollBall, RollBall]; tie: boolean };
  ramps?: { height: number; angles: [number, number]; speed: number; accels: [number, number] };
}

const num = (x: number) => String(Math.round(x * 10) / 10);
const secs = (t: number) => `${num(t)} ${num(t) === '1' ? 'second' : 'seconds'}`;
const rad = (deg: number) => (deg * Math.PI) / 180;
const SAME = 0.01; // arrival times within 1 percent count as the same

function verdict(ta: number, tb: number): number {
  if (Math.abs(ta - tb) <= SAME * Math.min(ta, tb)) return 2;
  return ta < tb ? 0 : 1;
}
const OPTIONS = ['A first', 'B first', 'Same time'];

function dip(seed: number, r: ReturnType<typeof rng>): Puzzle<RampParams> {
  const H = r.pick([1, 1.2, 1.5]);
  const E = r.pick([0.2, 0.3]);
  const L = r.pick([5, 6]);
  const frac = r.pick([0.45, 0.6, 0.75]);
  const d = Math.round(((H + E) / 2) * frac * 20) / 20;
  const dipIsA = r.next() < 0.5;
  const straight: DipTrack = { H, E, L, d: 0 };
  const dipped: DipTrack = { H, E, L, d };
  const tS = slidePath(straight).time;
  const tD = slidePath(dipped).time;
  const lands: [number, number] = dipIsA ? [tD, tS] : [tS, tD];
  const ai = verdict(lands[0], lands[1]);
  const sl = dipIsA ? 'B' : 'A';
  const dl = dipIsA ? 'A' : 'B';
  return {
    family: 'ramp-race',
    seed,
    key: `ramp-race:dip:${dl}:${H}:${E}:${L}:${d}`,
    label: 'Which ball wins?',
    question: `Two frictionless tracks start ${H} m up and end ${E} m up. Track ${sl} is straight. Track ${dl} dips in the middle and climbs back. Two balls start from rest together. Which reaches the finish first?`,
    options: OPTIONS,
    answerIndex: ai,
    answer: OPTIONS[ai],
    thinkSeconds: 7,
    stepCount: 3,
    params: {
      variant: 'dip',
      g: G,
      lands,
      fact: `Dip ${num(tD)} s, straight ${num(tS)} s`,
      dip: { track: dipped, dipIsA },
    },
  };
}

function rolling(seed: number, r: ReturnType<typeof rng>): Puzzle<RampParams> {
  const theta = r.pick([15, 20, 25, 30]);
  const length = r.pick([2, 3, 4]);
  const names = Object.keys(SHAPES) as ShapeName[];
  const tie = r.next() < 0.25;
  let shapes: [ShapeName, ShapeName];
  let sizes: [{ mass: number; radius: number }, { mass: number; radius: number }];
  if (tie) {
    const s = r.pick(names);
    shapes = [s, s];
    const big = { mass: 4, radius: 0.2 };
    const small = { mass: 1, radius: 0.1 };
    sizes = r.next() < 0.5 ? [big, small] : [small, big];
  } else {
    const two = r.shuffle(names).slice(0, 2) as [ShapeName, ShapeName];
    shapes = two;
    sizes = [
      { mass: 2, radius: 0.15 },
      { mass: 2, radius: 0.15 },
    ];
  }
  const make = (i: 0 | 1): RollBall => {
    const sh = SHAPES[shapes[i]];
    const a = (G * Math.sin(rad(theta))) / (1 + sh.k);
    return { label: i === 0 ? 'A' : 'B', shape: shapes[i], k: sh.k, hollow: sh.hollow, ...sizes[i], a, lands: Math.sqrt((2 * length) / a) };
  };
  const balls: [RollBall, RollBall] = [make(0), make(1)];
  const ai = verdict(balls[0].lands, balls[1].lands);
  const [ta, tb] = [balls[0].lands, balls[1].lands];
  const thin = shapes.some((s) => SHAPES[s].hollow) ? ' Hollow ones are thin-walled.' : '';
  const who = tie
    ? `Two ${SHAPES[shapes[0]].plural} roll down the same ramp. A is ${sizes[0].mass > sizes[1].mass ? 'heavy and wide, B is light and narrow' : 'light and narrow, B is heavy and wide'}.`
    : `A ${shapes[0]} (A) and a ${shapes[1]} (B) with the same mass and radius roll down the same ramp.`;
  return {
    family: 'ramp-race',
    seed,
    key: `ramp-race:rolling:${shapes[0].replace(' ', '-')}:${shapes[1].replace(' ', '-')}:${tie ? sizes[0].mass : 'same'}:${theta}:${length}`,
    label: 'Which reaches the bottom first?',
    question: `${who}${thin} Both start from rest together and roll without slipping. Which reaches the bottom first?`,
    options: OPTIONS,
    answerIndex: ai,
    answer: OPTIONS[ai],
    thinkSeconds: 7,
    stepCount: 3,
    params: {
      variant: 'rolling',
      g: G,
      lands: [ta, tb],
      fact: tie ? `Same shape, same time: ${num(ta)} s` : `Shape decides: ${num(Math.min(ta, tb))} s vs ${num(Math.max(ta, tb))} s`,
      rolling: { theta, length, balls, tie },
    },
  };
}

function steepShallow(seed: number, r: ReturnType<typeof rng>): Puzzle<RampParams> {
  const height = r.pick([0.8, 1.25, 1.8, 3.2, 5]);
  const steep = r.pick([45, 50, 55, 60, 65, 70]);
  const shallow = r.pick([15, 20, 25, 30]);
  const steepIsA = r.next() < 0.5;
  const angles: [number, number] = steepIsA ? [steep, shallow] : [shallow, steep];
  // Sliding down a frictionless ramp: acceleration g sin(theta) along a length h / sin(theta).
  const accels = angles.map((a) => G * Math.sin(rad(a))) as [number, number];
  const lens = angles.map((a) => height / Math.sin(rad(a)));
  const times = accels.map((a, i) => Math.sqrt((2 * lens[i]) / a)) as [number, number];
  const speeds = accels.map((a, i) => a * times[i]);
  const v = speeds[0];
  const same = Math.abs(speeds[0] - speeds[1]) <= SAME * v;
  const ai = same ? 2 : speeds[0] > speeds[1] ? 0 : 1;
  const options = ['A faster', 'B faster', 'Same speed'];
  const st = steepIsA ? 'A' : 'B';
  const sh = steepIsA ? 'B' : 'A';
  return {
    family: 'ramp-race',
    seed,
    key: `ramp-race:steep-shallow:${st}:${height}:${steep}:${shallow}`,
    label: 'Which is faster at the bottom?',
    question: `Two frictionless ramps are ${height} m high. Ramp ${st} is steep (${steep}°), ramp ${sh} is shallow (${shallow}°). Identical balls start from rest at the top. Which is moving faster at the bottom?`,
    options,
    answerIndex: ai,
    answer: options[ai],
    thinkSeconds: 6,
    stepCount: 3,
    params: {
      variant: 'steep-shallow',
      g: G,
      lands: times,
      fact: `Both hit ${num(v)} m/s at the bottom`,
      ramps: { height, angles, speed: v, accels },
    },
  };
}

function generate(seed: number): Puzzle<RampParams> {
  const r = rng(seed);
  return r.pick([dip, rolling, steepShallow])(seed, r);
}

function narrate(p: Puzzle<RampParams>): Line[] {
  const { variant, lands } = p.params;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const end = 'Follow for a new puzzle every day.';
  if (variant === 'dip') {
    const { dipIsA } = p.params.dip!;
    const dl = dipIsA ? 'A' : 'B';
    const sl = dipIsA ? 'B' : 'A';
    const [tD, tS] = dipIsA ? [lands[0], lands[1]] : [lands[1], lands[0]];
    const win = p.answerIndex === 0 ? 'A' : 'B';
    return [
      { id: 'h1', kind: 'hook', text: `Two frictionless tracks start at the same height and end at the same height. Track ${sl} is straight. Track ${dl} dips down in the middle and climbs back up. Two balls are released together.` },
      { id: 'h2', kind: 'hook', text: 'Which ball reaches the finish first?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Ball ${win} wins, the one on the dipped track. It takes ${secs(tD)}, against ${secs(tS)} for the straight one.` },
      { id: 's2', kind: 'step', step: 2, text: 'The dip lets the ball drop lower, so it builds up more speed. Its path is longer, but the extra speed more than makes up for it.' },
      { id: 'f1', kind: 'final', text: `A longer path can be the faster path. ${end}` },
    ];
  }
  if (variant === 'rolling') {
    const { balls, tie } = p.params.rolling!;
    const [a, b] = balls;
    const win = p.answerIndex === 0 ? a : b;
    const lose = p.answerIndex === 0 ? b : a;
    if (tie) {
      return [
        { id: 'h1', kind: 'hook', text: `Two ${SHAPES[a.shape].plural}, one heavy and wide, one light and narrow, are released together at the top of the same ramp. They roll without slipping.` },
        { id: 'h2', kind: 'hook', text: 'Which one reaches the bottom first?' },
        run,
        { id: 's1', kind: 'step', step: 1, text: `They arrive together, after ${secs(a.lands)}.` },
        { id: 's2', kind: 'step', step: 2, text: 'A heavier object is pulled harder, but it is also harder to get moving and spinning, so the mass cancels out. Size cancels out too. Only the shape decides the race, and these two have the same shape.' },
        { id: 'f1', kind: 'final', text: `Same shape, same time, whatever the mass or size. ${end}` },
      ];
    }
    return [
      { id: 'h1', kind: 'hook', text: `A ${a.shape} and a ${b.shape}, with the same mass and radius, are released together at the top of the same ramp. They roll without slipping.` },
      { id: 'h2', kind: 'hook', text: 'Which one reaches the bottom first?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `The ${win.shape} wins. It takes ${secs(win.lands)}, against ${secs(lose.lands)}.` },
      { id: 's2', kind: 'step', step: 2, text: `A rolling object has to spin as well as move down the ramp, and spinning takes energy. The ${win.shape} has more of its mass near the middle, so less energy goes into spinning and more into moving down.` },
      { id: 'f1', kind: 'final', text: `Same ramp, same start, but the shape decides the race. ${end}` },
    ];
  }
  const { ramps } = p.params;
  const r = ramps!;
  const [tsteep, tshallow] = r.angles[0] > r.angles[1] ? [lands[0], lands[1]] : [lands[1], lands[0]];
  return [
    { id: 'h1', kind: 'hook', text: 'Two frictionless ramps have the same height. One is steep, one is shallow. Two identical balls are released from the top at the same moment.' },
    { id: 'h2', kind: 'hook', text: 'Which ball is moving faster when it reaches the bottom?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `They are moving equally fast, at ${num(r.speed)} meters per second. The ball on the steep ramp just gets there sooner, after ${secs(tsteep)} against ${secs(tshallow)}.` },
    { id: 's2', kind: 'step', step: 2, text: 'The speed a ball gains depends only on how far it drops, because the height it loses turns into speed. Both drop the same height, so both end up equally fast. The steep ramp just gets there sooner.' },
    { id: 'f1', kind: 'final', text: `Same drop, same speed. Only the arrival time differs. ${end}` },
  ];
}

export const rampRace: Family<RampParams> = { id: 'ramp-race', generate, narrate };
