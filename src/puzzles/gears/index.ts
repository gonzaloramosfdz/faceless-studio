import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

/**
 * Units: one tooth = one unit of pitch diameter, so a gear's pitch radius is teeth / 2 units.
 * Angles are screen angles in radians (y points down), so positive = clockwise.
 */
export interface GearSpec {
  teeth: number;
  x: number;
  y: number;
  /** Start angle of tooth 0, set so that meshed gears interlock. */
  phase: number;
  /** Turns of this gear per turn of the rig's first gear. Positive = clockwise. */
  omega: number;
  hub: 'teeth' | 'start' | 'last' | 'none';
}
export interface Rig {
  title?: string;
  gears: GearSpec[];
  links: [number, number][];
  /** Loop that cannot turn: the pair of gears that collide. */
  jam?: [number, number];
}
export interface GearsParams {
  variant: 'direction' | 'speed' | 'idler' | 'loop';
  rigs: Rig[];
  /** Speed variant: stop after the first gear has made exactly one turn. */
  oneTurn?: boolean;
  fact: string;
  /** Speed variant: turns of the second gear per turn of the first, as a fraction. */
  ratio?: [number, number];
}

export const radius = (teeth: number) => teeth / 2;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const reduce = ([n, d]: [number, number]): [number, number] => {
  const g = gcd(n, d);
  return [n / g, d / g];
};
const END = 'Follow for a new puzzle every day.';
type R = ReturnType<typeof rng>;

/** Builds a rig: places gears, then sets phases and speeds along the meshes (a tree from gear 0). */
function buildRig(
  teeth: number[],
  pos: { x: number; y: number }[],
  links: [number, number][],
  hubs: GearSpec['hub'][],
  title?: string,
  jam?: [number, number],
): Rig {
  const gears: GearSpec[] = teeth.map((t, i) => ({ teeth: t, x: pos[i].x, y: pos[i].y, phase: 0, omega: 1, hub: hubs[i] }));
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (const [u, v] of links) {
      const j = u === i ? v : v === i ? u : -1;
      if (j < 0 || seen.has(j)) continue;
      seen.add(j);
      const gi = gears[i];
      const gj = gears[j];
      const alpha = Math.atan2(gj.y - gi.y, gj.x - gi.x);
      gj.phase = alpha + Math.PI - (gi.teeth * (gi.phase - alpha) + Math.PI) / gj.teeth;
      gj.omega = (-gi.omega * gi.teeth) / gj.teeth;
      queue.push(j);
    }
  }
  return { title, gears, links, jam };
}

/** Places gears in a chain; `angles[i]` is the direction from gear i to gear i+1. */
function chain(teeth: number[], angles: number[]) {
  const pos = [{ x: 0, y: 0 }];
  for (let i = 0; i + 1 < teeth.length; i++) {
    const d = radius(teeth[i]) + radius(teeth[i + 1]);
    pos.push({ x: pos[i].x + d * Math.cos(angles[i]), y: pos[i].y + d * Math.sin(angles[i]) });
  }
  return pos;
}
const chainLinks = (n: number): [number, number][] => Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);

/** Direction of each gear by pushing along meshes; returns null if a gear would need both directions. */
export function propagate(n: number, links: [number, number][]): number[] | null {
  const dir: number[] = Array(n).fill(0);
  dir[0] = 1;
  const queue = [0];
  while (queue.length) {
    const i = queue.shift()!;
    for (const [u, v] of links) {
      const j = u === i ? v : v === i ? u : -1;
      if (j < 0) continue;
      if (dir[j] === 0) {
        dir[j] = -dir[i];
        queue.push(j);
      } else if (dir[j] !== -dir[i]) return null;
    }
  }
  return dir;
}

const turnsText = ([n, d]: [number, number]) => {
  const whole = Math.floor(n / d);
  const rem = n - whole * d;
  if (rem === 0) return `${whole} ${whole === 1 ? 'turn' : 'turns'}`;
  return whole > 0 ? `${whole} ${rem}/${d} turns` : `${rem}/${d} turn`;
};
const FRAC_WORDS: Record<string, string> = { '1/2': 'a half', '1/3': 'a third', '2/3': 'two thirds', '1/4': 'a quarter', '3/4': 'three quarters' };
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const turnsSpoken = ([n, d]: [number, number]) => {
  const whole = Math.floor(n / d);
  const rem = n - whole * d;
  if (rem === 0) return `${NUM_WORDS[whole]} ${whole === 1 ? 'turn' : 'turns'}`;
  const f = FRAC_WORDS[`${rem}/${d}`];
  return whole > 0 ? `${NUM_WORDS[whole]} and ${f} turns` : `${f} of a turn`;
};

function direction(seed: number, r: R): Puzzle<GearsParams> {
  const n = r.int(3, 6);
  const teeth = Array.from({ length: n }, () => r.pick([10, 12, 14, 16]));
  const zig = r.pick([26, 30, 34]) * (Math.PI / 180);
  const angles = Array.from({ length: n - 1 }, (_, i) => (i % 2 === 0 ? zig : -zig));
  const hubs: GearSpec['hub'][] = teeth.map((_, i) => (i === 0 ? 'start' : i === n - 1 ? 'last' : 'none'));
  const rig = buildRig(teeth, chain(teeth, angles), chainLinks(n), hubs);
  const dir = propagate(n, rig.links)!;
  const same = dir[n - 1] === 1;
  const options = r.shuffle(['Clockwise', 'Counter-clockwise', 'It jams']);
  const answer = same ? 'Clockwise' : 'Counter-clockwise';
  return {
    family: 'gears',
    seed,
    key: `gears:direction:${n}:${teeth.join('-')}`,
    label: 'Which way does it turn?',
    question: `${n} gears are meshed in a row, and the teeth do not slip. The first gear turns clockwise. Which way does the last gear turn?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'direction', rigs: [rig], fact: `${n} gears: ${n - 1} flips, ${same ? 'same way' : 'opposite way'}` },
  };
}

const RATIOS: [number, number][] = [[1, 2], [1, 3], [2, 3], [3, 4], [3, 2], [2, 1], [3, 1], [4, 3], [5, 2]];

function speed(seed: number, r: R): Puzzle<GearsParams> {
  const [n, d] = r.pick(RATIOS);
  const ks: number[] = [];
  for (let k = 2; k <= 20; k++) if (n * k >= 10 && d * k >= 10 && n * k <= 40 && d * k <= 40) ks.push(k);
  const k = r.pick(ks);
  const N = n * k;
  const M = d * k;
  const teeth = [N, M];
  // One turn of the first gear moves N teeth past the meshing point, so the second turns N / M times.
  const turns = reduce([N, M]);
  const wrong1 = reduce([M, N]);
  const options = [turns, wrong1, [1, 1] as [number, number]];
  const texts = r.shuffle(options.map(turnsText));
  const rig = buildRig(teeth, chain(teeth, [0]), chainLinks(2), ['teeth', 'teeth']);
  return {
    family: 'gears',
    seed,
    key: `gears:speed:${N}:${M}`,
    label: 'How many turns?',
    question: `A gear with ${N} teeth drives a gear with ${M} teeth, and the teeth do not slip. When the first gear makes one full turn, how many turns does the second make?`,
    options: texts,
    answerIndex: texts.indexOf(turnsText(turns)),
    answer: turnsText(turns),
    thinkSeconds: 8,
    stepCount: 3,
    params: { variant: 'speed', rigs: [rig], oneTurn: true, ratio: turns, fact: `${N} teeth ÷ ${M} teeth = ${turnsText(turns)}` },
  };
}

/** Speed of the last gear (turns per turn of the first) for a chain, tooth by tooth, as an exact fraction. */
export function chainRatio(teeth: number[]): [number, number] {
  let r: [number, number] = [1, 1];
  for (let i = 0; i + 1 < teeth.length; i++) r = reduce([r[0] * teeth[i], r[1] * teeth[i + 1]]);
  return r;
}

function idler(seed: number, r: R): Puzzle<GearsParams> {
  const evens = [10, 12, 14, 16, 18, 20];
  const A = r.pick(evens);
  let C = r.pick(evens);
  if (C === A) C = A === 20 ? 10 : A + 2;
  let B = r.pick([8, 10, 12, 14, 16, 20, 24, 28]);
  if (B === A && B === C) B += 4;
  const withMid = chainRatio([A, B, C]);
  const direct = chainRatio([A, C]);
  const cmp = withMid[0] * direct[1] - direct[0] * withMid[1];
  const answer = cmp === 0 ? 'Same speed' : cmp > 0 ? 'Faster' : 'Slower';
  const options = r.shuffle(['Faster', 'Slower', 'Same speed']);
  const top = buildRig([A, B, C], chain([A, B, C], [0, 0]), chainLinks(3), ['teeth', 'teeth', 'teeth'], 'With the middle gear');
  const bottom = buildRig([A, C], chain([A, C], [0]), chainLinks(2), ['teeth', 'teeth'], 'Meshed directly');
  return {
    family: 'gears',
    seed,
    key: `gears:idler:${A}:${B}:${C}`,
    label: 'Does the middle gear matter?',
    question: `Gear A (${A} teeth) drives gear C (${C} teeth) through a middle gear B (${B} teeth). Compared with A meshing with C directly, how fast does C turn? Ignore direction. Teeth do not slip.`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 8,
    stepCount: 3,
    params: { variant: 'idler', rigs: [top, bottom], fact: `Only ${A} and ${C} teeth matter` },
  };
}

function loop(seed: number, r: R): Puzzle<GearsParams> {
  const triangle = r.next() < 0.6;
  let rig: Rig;
  let key: string;
  if (triangle) {
    const teeth = Array.from({ length: 3 }, () => r.pick([10, 12, 14, 16, 18, 20]));
    const [ra, rb, rc] = teeth.map(radius);
    // Gear 0 at the top, gears 1 and 2 below, every pair touching.
    const dAB = ra + rb, dAC = ra + rc, dBC = rb + rc;
    const cosB = (dAB * dAB + dBC * dBC - dAC * dAC) / (2 * dAB * dBC);
    const B = { x: 0, y: 0 };
    const Cc = { x: dBC, y: 0 };
    const angleAtB = Math.acos(cosB);
    const Ap = { x: dAB * Math.cos(angleAtB), y: -dAB * Math.sin(angleAtB) };
    rig = buildRig(teeth, [Ap, B, Cc], [[0, 1], [0, 2], [1, 2]], ['start', 'none', 'none'], undefined, [1, 2]);
    key = `gears:loop:3:${teeth.join('-')}`;
  } else {
    const t = r.pick([12, 14, 16, 20]);
    const d = t;
    rig = buildRig([t, t, t, t], [{ x: 0, y: 0 }, { x: d, y: 0 }, { x: d, y: d }, { x: 0, y: d }], [[0, 1], [1, 2], [2, 3], [3, 0]], ['start', 'none', 'none', 'none']);
    key = `gears:loop:4:${t}`;
  }
  const n = rig.gears.length;
  const turns = propagate(n, rig.links) !== null;
  const options = r.shuffle(['They all turn', 'They jam', 'Only some turn']);
  const answer = turns ? 'They all turn' : 'They jam';
  return {
    family: 'gears',
    seed,
    key,
    label: 'Can they turn?',
    question: triangle
      ? `Three gears sit in a triangle, and each one meshes with the other two. Teeth do not slip. The first gear is pushed to turn. Can the gears turn?`
      : `Four equal gears sit in a square, and each one meshes with the two beside it. Teeth do not slip. The first gear is pushed to turn. Can the gears turn?`,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: 7,
    stepCount: 3,
    params: { variant: 'loop', rigs: [rig], fact: turns ? `${n} gears in a ring: all turn` : `${n} gears in a ring: they jam` },
  };
}

function generate(seed: number): Puzzle<GearsParams> {
  const r = rng(seed);
  return r.pick([direction, speed, idler, loop])(seed, r);
}

function narrate(p: Puzzle<GearsParams>): Line[] {
  const { variant, rigs, ratio } = p.params;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  const g = rigs[0].gears;
  if (variant === 'direction') {
    const n = g.length;
    const same = p.answer === 'Clockwise';
    return [
      { id: 'h1', kind: 'hook', text: `${n} gears are meshed in a row, and their teeth do not slip. The first gear turns clockwise.` },
      { id: 'h2', kind: 'hook', text: 'Which way does the last gear turn?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: same ? 'The last gear turns clockwise, the same way as the first.' : 'The last gear turns counter-clockwise, the opposite way from the first.' },
      { id: 's2', kind: 'step', step: 2, text: `Two meshed gears always turn opposite ways, so every mesh flips the direction. With ${n} gears there are ${n - 1} meshes. ${n - 1} flips ${same ? 'cancel out in pairs, so the last gear matches the first.' : 'leave one flip over, so the last gear is reversed.'}` },
      { id: 'f1', kind: 'final', text: `An odd number of gears gives the same direction. ${END}` },
    ];
  }
  if (variant === 'speed') {
    const [N, M] = [g[0].teeth, g[1].teeth];
    const t = ratio!;
    return [
      { id: 'h1', kind: 'hook', text: `A gear with ${N} teeth drives a gear with ${M} teeth. Their teeth mesh with no slipping.` },
      { id: 'h2', kind: 'hook', text: 'When the first gear makes one full turn, how many turns does the second gear make?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `The second gear makes ${turnsSpoken(t)}.` },
      { id: 's2', kind: 'step', step: 2, text: `In one turn, ${N} teeth of the first gear pass the meshing point, so ${N} teeth of the second gear move past as well. That is ${N} out of ${M} teeth, which is ${turnsSpoken(t)}.` },
      { id: 'f1', kind: 'final', text: `${N < M ? 'A bigger gear always turns slower.' : 'A smaller gear always spins faster.'} ${END}` },
    ];
  }
  if (variant === 'idler') {
    const [A, B, C] = rigs[0].gears.map((x) => x.teeth);
    const same = p.answer === 'Same speed';
    return [
      { id: 'h1', kind: 'hook', text: `Three gears are meshed in a row. The first has ${A} teeth, the last has ${C} teeth, and the middle one has ${B} teeth.` },
      { id: 'h2', kind: 'hook', text: 'Compared with meshing the first and last gears directly, how fast does the last gear turn?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: same ? 'The last gear turns at exactly the same speed. Only its direction changes.' : `The last gear turns ${p.answer.toLowerCase()}.` },
      { id: 's2', kind: 'step', step: 2, text: `Every tooth that passes on the first gear passes on the middle gear, and then on the last gear. The middle gear's size cancels out, so only the first and last tooth counts matter, ${A} and ${C}.` },
      { id: 'f1', kind: 'final', text: `A middle gear can change direction, but never speed. ${END}` },
    ];
  }
  const n = g.length;
  const jam = p.answer === 'They jam';
  return jam
    ? [
        { id: 'h1', kind: 'hook', text: 'Three gears sit in a triangle, and each one meshes with the other two. The first gear is pushed to turn.' },
        { id: 'h2', kind: 'hook', text: 'Can the gears turn?' },
        run,
        { id: 's1', kind: 'step', step: 1, text: 'They jam. Nothing can turn.' },
        { id: 's2', kind: 'step', step: 2, text: 'Meshed gears turn opposite ways. The first gear makes the second turn one way, and the second makes the third turn the other way. But the third also touches the first, so it would need to turn opposite to it, and that is impossible.' },
        { id: 'f1', kind: 'final', text: `A ring with an odd number of gears always jams. ${END}` },
      ]
    : [
        { id: 'h1', kind: 'hook', text: `${n} equal gears sit in a square, and each one meshes with the two beside it. The first gear is pushed to turn.` },
        { id: 'h2', kind: 'hook', text: 'Can the gears turn?' },
        run,
        { id: 's1', kind: 'step', step: 1, text: 'They all turn freely.' },
        { id: 's2', kind: 'step', step: 2, text: 'The directions alternate around the ring: clockwise, counter-clockwise, clockwise, counter-clockwise. The last gear then fits against the first, because they already turn opposite ways.' },
        { id: 'f1', kind: 'final', text: `A ring with an even number of gears turns fine. ${END}` },
      ];
}

export const gears: Family<GearsParams> = { id: 'gears', generate, narrate };
