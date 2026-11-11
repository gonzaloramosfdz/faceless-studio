import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export const G_EARTH = 9.81;
export const G_MOON = 1.62;

export interface Pend {
  label: 'A' | 'B';
  /** String length in metres, bob mass in kg, local gravity in m/s^2. */
  length: number;
  mass: number;
  g: number;
  place: 'Earth' | 'Moon';
  /** Short caption drawn under the pendulum. */
  caption: string;
}
export interface PendulumParams {
  variant: 'mass' | 'length' | 'moon' | 'ratio';
  /** Release angle in degrees (small swings only). */
  amp: number;
  pends: [Pend, Pend];
  /** Time of one full swing, seconds. */
  periods: [number, number];
  /** How many seconds of real swinging the animation covers. */
  simSeconds: number;
  fact: string;
}

/** Small-swing period of a pendulum. */
export const period = (length: number, g: number) => 2 * Math.PI * Math.sqrt(length / g);

/** The real pendulum equation, theta'' = -(g / L) sin(theta), stepped with RK4. Angles in radians, one value per step. */
export function swingTable(length: number, g: number, ampDeg: number, seconds: number, dt = 0.004) {
  const w2 = g / length;
  let th = (ampDeg * Math.PI) / 180;
  let om = 0;
  const out = [th];
  const n = Math.ceil(seconds / dt) + 2;
  for (let i = 0; i < n; i++) {
    const a1 = -w2 * Math.sin(th);
    const t2 = th + (dt / 2) * om, o2 = om + (dt / 2) * a1;
    const a2 = -w2 * Math.sin(t2);
    const t3 = th + (dt / 2) * o2, o3 = om + (dt / 2) * a2;
    const a3 = -w2 * Math.sin(t3);
    const t4 = th + dt * o3, o4 = om + dt * a3;
    const a4 = -w2 * Math.sin(t4);
    th += (dt / 6) * (om + 2 * o2 + 2 * o3 + o4);
    om += (dt / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
    out.push(th);
  }
  return { dt, th: out };
}
export function angleAt(tab: ReturnType<typeof swingTable>, t: number) {
  const i = Math.min(Math.floor(t / tab.dt), tab.th.length - 2);
  const f = t / tab.dt - i;
  return tab.th[i] + (tab.th[i + 1] - tab.th[i]) * f;
}

const num = (x: number) => String(Math.round(x * 10) / 10);
const secs = (t: number) => `${num(t)} ${num(t) === '1' ? 'second' : 'seconds'}`;
const metres = (x: number) => `${num(x)} ${x === 1 ? 'meter' : 'meters'}`;
const kilos = (x: number) => `${num(x)} ${x === 1 ? 'kilogram' : 'kilograms'}`;
const word = (n: number) => ({ 2: 'two', 3: 'three', 4: 'four', 9: 'nine' })[n] ?? String(n);
const SAME = 0.005;

function faster(ta: number, tb: number): number {
  if (Math.abs(ta - tb) <= SAME * Math.min(ta, tb)) return 2;
  return ta < tb ? 0 : 1;
}

function pend(label: 'A' | 'B', length: number, mass: number, g: number, caption: string): Pend {
  return { label, length, mass, g, place: g === G_MOON ? 'Moon' : 'Earth', caption };
}

function mass(seed: number, r: ReturnType<typeof rng>): Puzzle<PendulumParams> {
  const L = r.pick([0.5, 1, 1.5, 2, 3]);
  const heavy = r.pick([2, 5, 10]);
  const light = r.pick([0.1, 0.2, 0.5]);
  const heavyIsA = r.next() < 0.5;
  const amp = r.pick([8, 10, 12]);
  const [ma, mb] = heavyIsA ? [heavy, light] : [light, heavy];
  const pends: [Pend, Pend] = [pend('A', L, ma, G_EARTH, `${num(ma)} kg`), pend('B', L, mb, G_EARTH, `${num(mb)} kg`)];
  const periods = pends.map((q) => period(q.length, q.g)) as [number, number];
  const ai = faster(periods[0], periods[1]);
  const options = ['A faster', 'B faster', 'Same'];
  return {
    family: 'pendulum',
    seed,
    key: `pendulum:mass:${L}:${ma}:${mb}:${amp}`,
    label: 'Which swings faster?',
    question: `Two pendulums have strings of the same length, ${L} m. Bob A has a mass of ${num(ma)} kg, bob B has a mass of ${num(mb)} kg. Both are released together from the same small angle. No air resistance. Which swings faster, meaning which takes less time for one full swing back and forth?`,
    options,
    answerIndex: ai,
    answer: options[ai],
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'mass', amp, pends, periods, simSeconds: 2.5 * periods[0], fact: `Both take ${num(periods[0])} s per swing` },
  };
}

function length(seed: number, r: ReturnType<typeof rng>): Puzzle<PendulumParams> {
  const pool = [0.25, 0.5, 1, 1.5, 2, 3, 4];
  let two: number[];
  do two = r.shuffle(pool).slice(0, 2);
  while (Math.max(...two) / Math.min(...two) < 1.5);
  const amp = r.pick([8, 10, 12]);
  const pends: [Pend, Pend] = [pend('A', two[0], 1, G_EARTH, `${two[0]} m`), pend('B', two[1], 1, G_EARTH, `${two[1]} m`)];
  const periods = pends.map((q) => period(q.length, q.g)) as [number, number];
  const ai = faster(periods[0], periods[1]);
  const options = ['A faster', 'B faster', 'Same'];
  return {
    family: 'pendulum',
    seed,
    key: `pendulum:length:${two[0]}:${two[1]}:${amp}`,
    label: 'Which swings faster?',
    question: `Pendulum A has a string ${two[0]} m long and pendulum B has a string ${two[1]} m long. Both are released together from the same small angle. No air resistance. Which swings faster, meaning which takes less time for one full swing back and forth?`,
    options,
    answerIndex: ai,
    answer: options[ai],
    thinkSeconds: 7,
    stepCount: 3,
    params: {
      variant: 'length',
      amp,
      pends,
      periods,
      simSeconds: 1.75 * Math.max(...periods),
      fact: `${num(Math.min(...periods))} s vs ${num(Math.max(...periods))} s per swing`,
    },
  };
}

function moon(seed: number, r: ReturnType<typeof rng>): Puzzle<PendulumParams> {
  const L = r.pick([0.5, 1, 1.5, 2, 3, 4]);
  const m = r.pick([1, 2, 5]);
  const earthIsA = r.next() < 0.5;
  const amp = r.pick([8, 10, 12]);
  const gs = earthIsA ? [G_EARTH, G_MOON] : [G_MOON, G_EARTH];
  const pends: [Pend, Pend] = [pend('A', L, m, gs[0], gs[0] === G_EARTH ? 'Earth' : 'Moon'), pend('B', L, m, gs[1], gs[1] === G_EARTH ? 'Earth' : 'Moon')];
  const periods = pends.map((q) => period(q.length, q.g)) as [number, number];
  const slower = periods[0] > periods[1] ? 0 : 1;
  const answer = pends[slower].place === 'Moon' ? 'On the Moon' : 'On Earth';
  const options = r.shuffle(['On Earth', 'On the Moon', 'Same']);
  const te = period(L, G_EARTH);
  const tm = period(L, G_MOON);
  return {
    family: 'pendulum',
    seed,
    key: `pendulum:moon:${L}:${m}:${earthIsA ? 'A' : 'B'}:${amp}:${options.join('|')}`,
    label: 'Where does it swing slower?',
    question: `A pendulum with a ${L} m string and a ${m} kg bob swings on Earth. An identical pendulum swings on the Moon, where gravity is weaker. Pendulum A is on ${pends[0].place === 'Earth' ? 'Earth' : 'the Moon'}, pendulum B is on ${pends[1].place === 'Earth' ? 'Earth' : 'the Moon'}. Both are released from the same small angle. No air resistance. Where does it swing slower?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'moon', amp, pends, periods, simSeconds: 1.5 * Math.max(...periods), fact: `Earth ${num(te)} s, Moon ${num(tm)} s per swing` },
  };
}

function ratio(seed: number, r: ReturnType<typeof rng>): Puzzle<PendulumParams> {
  const k = r.pick([4, 9]);
  const short = r.pick(k === 4 ? [0.25, 0.5, 1] : [0.25, 0.5, 1]);
  const shortIsA = r.next() < 0.5;
  const amp = r.pick([8, 10, 12]);
  const [la, lb] = shortIsA ? [short, short * k] : [short * k, short];
  const pends: [Pend, Pend] = [pend('A', la, 1, G_EARTH, `${num(la)} m`), pend('B', lb, 1, G_EARTH, `${num(lb)} m`)];
  const periods = pends.map((q) => period(q.length, q.g)) as [number, number];
  const times = Math.max(...periods) / Math.min(...periods);
  const root = Math.round(times);
  const options = r.shuffle([`${root} times longer`, `${k} times longer`, `${2 * k} times longer`]);
  const [sl, ll] = shortIsA ? ['A', 'B'] : ['B', 'A'];
  return {
    family: 'pendulum',
    seed,
    key: `pendulum:ratio:${short}:${k}:${sl}:${amp}:${options.join('|')}`,
    label: 'How much longer per swing?',
    question: `Pendulum ${sl} has a string ${num(short)} m long. Pendulum ${ll} has a string ${k} times longer, ${num(short * k)} m. Both swing through small angles, with no air resistance. How much longer does one full swing of pendulum ${ll} take?`,
    options,
    answerIndex: options.indexOf(`${root} times longer`),
    answer: `${root} times longer`,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'ratio', amp, pends, periods, simSeconds: 1.75 * Math.max(...periods), fact: `Time grows with √length: √${k} = ${root}` },
  };
}

function generate(seed: number): Puzzle<PendulumParams> {
  const r = rng(seed);
  return r.pick([mass, length, moon, ratio])(seed, r);
}

function narrate(p: Puzzle<PendulumParams>): Line[] {
  const { variant, pends, periods } = p.params;
  const [a, b] = pends;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const end = 'Follow for a new puzzle every day.';
  if (variant === 'mass') {
    return [
      { id: 'h1', kind: 'hook', text: `Two pendulums have strings of the same length. Pendulum A carries a bob of ${kilos(a.mass)}. Pendulum B carries a bob of ${kilos(b.mass)}. Both are released together from the same small angle.` },
      { id: 'h2', kind: 'hook', text: 'Which one swings faster?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Neither. They swing at exactly the same rate, about ${secs(periods[0])} for one full swing.` },
      { id: 's2', kind: 'step', step: 2, text: 'A heavier bob is pulled harder by gravity, but it is also harder to get moving. The two effects cancel exactly, so the mass makes no difference.' },
      { id: 'f1', kind: 'final', text: `Only the length of the string and the strength of gravity set the pace. ${end}` },
    ];
  }
  if (variant === 'length') {
    const w = p.answerIndex === 0 ? a : b;
    const l = p.answerIndex === 0 ? b : a;
    return [
      { id: 'h1', kind: 'hook', text: `Two pendulums are released together from the same small angle. Pendulum A has a string ${metres(a.length)} long. Pendulum B has a string ${metres(b.length)} long.` },
      { id: 'h2', kind: 'hook', text: 'Which one swings faster?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `The shorter one, pendulum ${w.label}. One full swing takes about ${secs(period(w.length, w.g))}, against about ${secs(period(l.length, l.g))} for pendulum ${l.label}.` },
      { id: 's2', kind: 'step', step: 2, text: 'The time for one swing grows with the square root of the string length, so a shorter string means a quicker swing.' },
      { id: 'f1', kind: 'final', text: `Shorter string, quicker swing. ${end}` },
    ];
  }
  if (variant === 'moon') {
    const te = period(a.length, G_EARTH);
    const tm = period(a.length, G_MOON);
    return [
      { id: 'h1', kind: 'hook', text: `The same pendulum is set swinging twice, once on Earth and once on the Moon, from the same small angle. On the Moon, gravity is about one sixth as strong.` },
      { id: 'h2', kind: 'hook', text: 'Where does it swing slower?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `On the Moon. One swing takes about ${secs(tm)} there, against about ${secs(te)} on Earth.` },
      { id: 's2', kind: 'step', step: 2, text: 'With weaker gravity, the pull back toward the middle is weaker, so each swing takes longer. Here it takes about two and a half times as long.' },
      { id: 'f1', kind: 'final', text: `Same string, same bob, different world, different pace. ${end}` },
    ];
  }
  const k = Math.round(Math.max(a.length, b.length) / Math.min(a.length, b.length));
  const root = Math.round(Math.sqrt(k));
  const [sl, ll] = a.length < b.length ? ['A', 'B'] : ['B', 'A'];
  const sp = a.length < b.length ? periods[0] : periods[1];
  const lp = a.length < b.length ? periods[1] : periods[0];
  return [
    { id: 'h1', kind: 'hook', text: `Pendulum ${ll} has a string ${word(k)} times longer than pendulum ${sl}. Both swing through small angles.` },
    { id: 'h2', kind: 'hook', text: 'How many times longer does one full swing take?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `Only ${word(root)} times longer. Pendulum ${sl} takes about ${secs(sp)}, pendulum ${ll} about ${secs(lp)}.` },
    { id: 's2', kind: 'step', step: 2, text: `The time for one swing grows with the square root of the string length, and the square root of ${word(k)} is ${word(root)}.` },
    { id: 'f1', kind: 'final', text: `${word(k)[0].toUpperCase() + word(k).slice(1)} times the string, ${word(root)} times the wait. ${end}` },
  ];
}

export const pendulum: Family<PendulumParams> = { id: 'pendulum', generate, narrate };
