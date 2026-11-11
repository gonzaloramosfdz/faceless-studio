import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

/** One falling object. Heights in metres, speeds in m/s. */
export interface Body {
  name: string;
  label: 'A' | 'B';
  height: number;
  vx: number;
  big: boolean;
  /** Landing time, computed from the physics below. */
  lands: number;
}
export interface FreefallParams {
  variant: 'sideways' | 'heavy-light' | 'higher';
  place: string;
  g: number;
  bodies: [Body, Body];
  fact: string;
}

export const fallTime = (height: number, g: number) => Math.sqrt((2 * height) / g);
const num = (x: number) => String(Math.round(x * 10) / 10);
const secs = (t: number) => `${num(t)} ${num(t) === '1' ? 'second' : 'seconds'}`;

// With g = 10 these heights give whole-second falls.
const TIDY = [5, 20, 45, 80];

function sideways(seed: number, r: ReturnType<typeof rng>): Puzzle<FreefallParams> {
  const height = r.pick(TIDY);
  const vx = r.pick([5, 10, 15, 20, 30]);
  const [thing, launcher] = r.pick([
    ['ball', 'thrown sideways'],
    ['coin', 'flicked sideways'],
    ['bullet', 'fired horizontally'],
    ['marble', 'launched sideways'],
  ]);
  const t = fallTime(height, 10);
  return {
    family: 'freefall',
    seed,
    key: `freefall:sideways:${thing}:${height}:${vx}`,
    label: 'Which lands first?',
    question: `${cap(thing)} A is dropped from ${height} m. At the same instant, ${thing} B is ${launcher} at ${vx} m/s from the same height. No air resistance.`,
    options: ['A first', 'B first', 'Same time'],
    answerIndex: 2,
    answer: 'Same time',
    thinkSeconds: 6,
    stepCount: 3,
    params: {
      variant: 'sideways',
      place: 'Earth',
      g: 10,
      fact: `Both fall ${height} m in ${num(t)} s`,
      bodies: [
        { name: `${thing} A`, label: 'A', height, vx: 0, big: false, lands: t },
        { name: `${thing} B`, label: 'B', height, vx, big: false, lands: t },
      ],
    },
  };
}

function heavyLight(seed: number, r: ReturnType<typeof rng>): Puzzle<FreefallParams> {
  const moon = r.next() < 0.5;
  const [heavy, light] = moon
    ? r.pick([['hammer', 'feather'], ['wrench', 'sheet of paper'], ['rock', 'glove']])
    : r.pick([['bowling ball', 'feather'], ['brick', 'ping-pong ball'], ['anvil', 'leaf']]);
  const g = moon ? 1.6 : 10;
  const height = moon ? r.pick([1.2, 1.5, 2]) : r.pick([5, 8, 10]);
  const t = fallTime(height, g);
  return {
    family: 'freefall',
    seed,
    key: `freefall:heavy-light:${moon ? 'moon' : 'vacuum'}:${heavy}:${light}:${height}`,
    label: 'Which lands first?',
    question: moon
      ? `On the Moon, an astronaut drops a ${heavy} (A) and a ${light} (B) from ${height} m at the same moment.`
      : `Inside a giant vacuum chamber with all the air pumped out, a ${heavy} (A) and a ${light} (B) are dropped from ${height} m at the same moment.`,
    options: ['A first', 'B first', 'Same time'],
    answerIndex: 2,
    answer: 'Same time',
    thinkSeconds: 6,
    stepCount: 3,
    params: {
      variant: 'heavy-light',
      place: moon ? 'the Moon' : 'a vacuum chamber',
      g,
      fact: `No air: both land in ${num(t)} s`,
      bodies: [
        { name: heavy, label: 'A', height, vx: 0, big: true, lands: t },
        { name: light, label: 'B', height, vx: 0, big: false, lands: t },
      ],
    },
  };
}

function higher(seed: number, r: ReturnType<typeof rng>): Puzzle<FreefallParams> {
  const ratio = r.pick([4, 9]);
  const low = r.pick(ratio === 4 ? [5, 20] : [5]);
  const root = Math.sqrt(ratio);
  const options = r.shuffle([`${root}× longer`, `${ratio}× longer`, `${ratio * ratio}× longer`]);
  const thing = r.pick(['ball', 'stone', 'apple']);
  return {
    family: 'freefall',
    seed,
    key: `freefall:higher:${thing}:${low}:${ratio}:${options.join('|')}`,
    label: 'How much longer?',
    question: `${cap(thing)} A falls from ${low} m. ${cap(thing)} B falls from ${low * ratio} m, which is ${ratio} times higher. How much longer does B take to land? No air resistance.`,
    options,
    answerIndex: options.indexOf(`${root}× longer`),
    answer: `${root}× longer`,
    thinkSeconds: 7,
    stepCount: 3,
    params: {
      variant: 'higher',
      place: 'Earth',
      g: 10,
      fact: `Time grows with √height: √${ratio} = ${root}`,
      bodies: [
        { name: `${thing} A`, label: 'A', height: low, vx: 0, big: false, lands: fallTime(low, 10) },
        { name: `${thing} B`, label: 'B', height: low * ratio, vx: 0, big: false, lands: fallTime(low * ratio, 10) },
      ],
    },
  };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function generate(seed: number): Puzzle<FreefallParams> {
  const r = rng(seed);
  return r.pick([sideways, heavyLight, higher])(seed, r);
}

function narrate(p: Puzzle<FreefallParams>): Line[] {
  const { variant, bodies, place } = p.params;
  const [a, b] = bodies;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const end = 'Follow for a new puzzle every day.';
  if (variant === 'sideways') {
    const thing = a.name.replace(' A', '');
    return [
      { id: 'h1', kind: 'hook', text: `One ${thing} is dropped from ${a.height} meters. At the same instant, another is launched sideways at ${b.vx} meters per second from the same height.` },
      { id: 'h2', kind: 'hook', text: 'Which one hits the ground first?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `They land at the same time, after ${secs(a.lands)}.` },
      { id: 's2', kind: 'step', step: 2, text: 'Moving sideways does not slow the fall. Gravity only pulls downward, so both drop at exactly the same rate.' },
      { id: 'f1', kind: 'final', text: `Sideways motion and falling are independent. ${end}` },
    ];
  }
  if (variant === 'heavy-light') {
    const moon = place === 'the Moon';
    return [
      { id: 'h1', kind: 'hook', text: moon
          ? `On the Moon, an astronaut drops a ${a.name} and a ${b.name} from the same height at the same moment.`
          : `In a giant vacuum chamber, with all the air pumped out, a ${a.name} and a ${b.name} are dropped at the same moment.` },
      { id: 'h2', kind: 'hook', text: 'Which one lands first?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `They land together, after ${secs(a.lands)}.` },
      { id: 's2', kind: 'step', step: 2, text: `The ${a.name} is pulled harder, but it is also harder to get moving. The two effects cancel exactly, so without air everything falls at the same rate.` },
      { id: 'f1', kind: 'final', text: moon
          ? `Apollo 15 astronaut David Scott did this on the Moon in 1971, with a hammer and a feather. ${end}`
          : `On Earth, it is only the air that makes a feather slow. ${end}` },
    ];
  }
  const ratio = b.height / a.height;
  const root = Math.sqrt(ratio);
  const word = (n: number) => ({ 2: 'two', 3: 'three', 4: 'four', 9: 'nine', 16: 'sixteen', 81: 'eighty-one' })[n] ?? String(n);
  return [
    { id: 'h1', kind: 'hook', text: `Two objects are dropped. The second one starts ${word(ratio)} times higher than the first.` },
    { id: 'h2', kind: 'hook', text: 'How many times longer does it take to reach the ground?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `The low one lands after ${secs(a.lands)}, the high one after ${secs(b.lands)}. Only ${word(root)} times longer.` },
    { id: 's2', kind: 'step', step: 2, text: `A falling object keeps speeding up, so it covers the extra height quickly. Fall time grows with the square root of the height, and the square root of ${word(ratio)} is ${word(root)}.` },
    { id: 'f1', kind: 'final', text: `${cap(word(ratio))} times the height, ${word(root)} times the wait. ${end}` },
  ];
}

export const freefall: Family<FreefallParams> = { id: 'freefall', generate, narrate };
