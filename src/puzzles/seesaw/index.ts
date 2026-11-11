import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

/** One weight on the beam. `x` is metres from the pivot: negative = left, positive = right. */
export interface Weight {
  kg: number;
  x: number;
}
export interface SeesawParams {
  variant: 'which-side' | 'where-to-sit' | 'off-centre';
  /** Beam extent left and right of the pivot, in metres. */
  a: number;
  b: number;
  weights: Weight[];
  /** Off-centre variant: the plank's own weight, acting at its middle (x = position of the middle). */
  plank?: { kg: number; x: number };
  /** Index in `weights` of the weight that is brought in during the simulation. */
  slide?: number;
  /** Turning effects about the pivot (kg times m) and the net (right minus left). */
  left: number;
  right: number;
  net: number;
  fact: string;
}

/** Torque about the pivot, computed from scratch: weight times distance on each side. */
export function torques(weights: Weight[], plank?: Weight) {
  let left = 0;
  let right = 0;
  for (const w of [...weights, ...(plank ? [plank] : [])]) {
    if (w.x < 0) left += w.kg * -w.x;
    else right += w.kg * w.x;
  }
  return { left, right, net: right - left };
}

export const SIDE_OPTIONS = ['Left down', 'Right down', 'Balanced'];
const sideAnswer = (net: number) => (net === 0 ? 'Balanced' : net > 0 ? 'Right down' : 'Left down');

const num = (x: number) => String(Math.round(x * 10) / 10);
const meters = (x: number) => `${num(x)} ${x === 1 ? 'meter' : 'meters'}`;
const kgs = (k: number) => `${k} ${k === 1 ? 'kilogram' : 'kilograms'}`;
const END = 'Follow for a new puzzle every day.';
type R = ReturnType<typeof rng>;
const D = (ws: Weight[]) => ws.map((w) => `${w.kg} kg at ${num(Math.abs(w.x))} m`).join(' and ');

function finish(
  seed: number,
  key: string,
  label: string,
  question: string,
  options: string[],
  answer: string,
  think: number,
  params: Omit<SeesawParams, 'left' | 'right' | 'net'> & { fact: string },
): Puzzle<SeesawParams> {
  const t = torques(params.weights, params.plank);
  return {
    family: 'seesaw',
    seed,
    key,
    label,
    question,
    options,
    answerIndex: options.indexOf(answer),
    answer,
    thinkSeconds: think,
    stepCount: 3,
    params: { ...params, ...t },
  };
}

function whichSide(seed: number, r: R): Puzzle<SeesawParams> {
  const wantBal = r.next() < 0.32;
  const pair = r.next() < 0.4;
  let A: { kg: number; d: number }[] = [];
  let B: { kg: number; d: number }[] = [];
  const tq = (s: { kg: number; d: number }[]) => s.reduce((n, w) => n + w.kg * w.d, 0);
  for (let t = 0; t < 400; t++) {
    const bal = wantBal && t < 300;
    if (pair) {
      const d1 = r.int(1, 4);
      let d2 = r.int(1, 4);
      if (d2 === d1) d2 = (d1 % 4) + 1;
      A = [{ kg: r.int(1, 6), d: d1 }, { kg: r.int(1, 6), d: d2 }];
    } else A = [{ kg: r.int(2, 9), d: r.int(1, 4) }];
    const TA = tq(A);
    if (bal) {
      const ds = r.shuffle([1, 2, 3, 4]).filter((d) => TA % d === 0 && TA / d >= 2 && TA / d <= 9);
      if (!ds.length) continue;
      B = [{ kg: TA / ds[0], d: ds[0] }];
      if (!pair && B[0].kg === A[0].kg && B[0].d === A[0].d) continue;
      break;
    }
    B = [{ kg: r.int(2, 9), d: r.int(1, 4) }];
    if (tq(B) === TA) continue;
    if (!pair && r.next() < 0.5 && (A[0].kg - B[0].kg) * (A[0].d - B[0].d) >= 0) continue;
    break;
  }
  const flip = r.next() < 0.5;
  const L = (flip ? B : A).map((w) => ({ kg: w.kg, x: -w.d }));
  const Rt = (flip ? A : B).map((w) => ({ kg: w.kg, x: w.d }));
  const weights = [...L, ...Rt];
  const t = torques(weights);
  const answer = sideAnswer(t.net);
  return finish(
    seed,
    `seesaw:which-side:${L.map((w) => `${w.kg}@${-w.x}`).join(',')}|${Rt.map((w) => `${w.kg}@${w.x}`).join(',')}`,
    'Which side goes down?',
    `A weightless seesaw rests on a pivot. Left side: ${D(L)} from the pivot. Right side: ${D(Rt)} from the pivot. Which side goes down?`,
    r.shuffle(SIDE_OPTIONS),
    answer,
    pair ? 8 : 7,
    { variant: 'which-side', a: 4.5, b: 4.5, weights, fact: `Turning: left ${t.left}, right ${t.right}` },
  );
}

function whereToSit(seed: number, r: R): Puzzle<SeesawParams> {
  let m1 = 6, m2 = 4, d1 = 2;
  for (let t = 0; t < 500; t++) {
    const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, 4);
    const d = (a * c) / b;
    if (a === b || d * 2 !== Math.round(d * 2) || d < 1 || d > 5) continue;
    m1 = a; m2 = b; d1 = c;
    break;
  }
  const d = (m1 * d1) / m2;
  const half = (x: number) => Math.round(x * 2) / 2;
  const cands: number[] = [];
  for (const c of [d1, half((m2 * d1) / m1), d + 1, d - 1, d * 2, d / 2, d + 0.5, d - 0.5].map(half)) {
    if (c >= 0.5 && c <= 5.5 && c !== d && !cands.includes(c)) cands.push(c);
  }
  const options = r.shuffle([d, cands[0], cands[1]]).map((x) => `${num(x)} m`);
  const placedLeft = r.next() < 0.5;
  const s = placedLeft ? -1 : 1;
  const weights = [{ kg: m1, x: s * d1 }, { kg: m2, x: -s * d }];
  const t = m1 * d1;
  return finish(
    seed,
    `seesaw:where-to-sit:${m1}@${d1}:${m2}`,
    'Where must it sit?',
    `A weightless seesaw has ${m1} kg sitting ${num(d1)} m from the pivot on the ${placedLeft ? 'left' : 'right'}. How far from the pivot must ${m2} kg sit on the other side to balance it?`,
    options,
    `${num(d)} m`,
    7,
    { variant: 'where-to-sit', a: 6, b: 6, weights, slide: 1, fact: `Weight × distance: ${t} = ${t}` },
  );
}

function offCentre(seed: number, r: R): Puzzle<SeesawParams> {
  const wantBal = r.next() < 0.25;
  let L = 8, c = 1, M = 6, m = 4, d = 1;
  for (let t = 0; t < 600; t++) {
    L = r.pick([6, 8, 10]);
    c = r.pick([1, 1.5, 2]);
    const short = L / 2 - c;
    M = r.int(2, 12);
    const dmax = Math.floor(short - 0.5);
    if (dmax < 1) continue;
    d = r.int(1, dmax);
    if (wantBal && t < 500) {
      const T = M * c;
      m = T / d;
      if (!Number.isInteger(m) || m < 2 || m > 12) continue;
    } else {
      m = r.int(2, 12);
      if (m * d === M * c) continue;
    }
    break;
  }
  const centreRight = r.next() < 0.5; // the plank's middle lies to the right of the pivot
  const sgn = centreRight ? 1 : -1;
  const longSide = centreRight ? 'right' : 'left';
  const weights = [{ kg: m, x: -sgn * d }];
  const plank = { kg: M, x: sgn * c };
  const t = torques(weights, plank);
  const fact = `Turning: plank ${num(M * c)}, weight ${m * d}`;
  return finish(
    seed,
    `seesaw:off-centre:${L}:${M}:${centreRight ? 'R' : 'L'}${c}:${m}@${d}`,
    'Which side goes down?',
    `A uniform plank, ${L} m long and weighing ${M} kg, rests on a pivot ${num(c)} m off its middle, so its ${longSide} side is the long one. A weight of ${m} kg sits on the short ${centreRight ? 'left' : 'right'} side, ${d} m from the pivot. Which side goes down?`,
    r.shuffle(SIDE_OPTIONS),
    sideAnswer(t.net),
    8,
    { variant: 'off-centre', a: L / 2 + (centreRight ? -c : c) * 1, b: L / 2 + (centreRight ? c : -c) * 1, weights, plank, fact },
  );
}

function generate(seed: number): Puzzle<SeesawParams> {
  const r = rng(seed);
  return r.pick([whichSide, whereToSit, offCentre])(seed, r);
}

const expr = (ws: Weight[]) => ws.map((w) => `${w.kg} times ${num(Math.abs(w.x))}`).join(' plus ');

function narrate(p: Puzzle<SeesawParams>): Line[] {
  const { variant, weights, left, right, net, plank } = p.params;
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch what actually happens.' };
  if (variant === 'which-side') {
    const L = weights.filter((w) => w.x < 0);
    const Rt = weights.filter((w) => w.x > 0);
    const sit = (ws: Weight[]) => ws.map((w) => `${kgs(w.kg)} ${w.kg === 1 ? 'sits' : 'sit'} ${meters(Math.abs(w.x))} out`).join(', and ');
    const verdict = net === 0 ? 'They are equal, so it balances.' : `The ${net > 0 ? 'right' : 'left'} side has the bigger total, so it goes down.`;
    return [
      { id: 'h1', kind: 'hook', text: `A weightless seesaw rests on its pivot. On the left, ${sit(L)}. On the right, ${sit(Rt)}.` },
      { id: 'h2', kind: 'hook', text: 'Which side goes down, or does it balance?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: net === 0 ? 'It balances perfectly.' : `The ${net > 0 ? 'right' : 'left'} side goes down.` },
      { id: 's2', kind: 'step', step: 2, text: `What counts is weight times distance. Left: ${expr(L)} is ${left}. Right: ${expr(Rt)} is ${right}. ${verdict}` },
      { id: 'f1', kind: 'final', text: `Distance counts as much as weight. ${END}` },
    ];
  }
  if (variant === 'where-to-sit') {
    const placed = weights[0];
    const mine = weights[1];
    const side = placed.x < 0 ? 'left' : 'right';
    const d = Math.abs(mine.x);
    const t = placed.kg * Math.abs(placed.x);
    return [
      { id: 'h1', kind: 'hook', text: `A weightless seesaw rests on its pivot. ${kgs(placed.kg)} sit ${meters(Math.abs(placed.x))} from the pivot on the ${side}. You place ${kgs(mine.kg)} on the other side.` },
      { id: 'h2', kind: 'hook', text: 'How far from the pivot must it sit to balance?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `It must sit ${meters(d)} from the pivot.` },
      { id: 's2', kind: 'step', step: 2, text: `Balance means equal turning effect, which is weight times distance. The first side gives ${placed.kg} times ${num(Math.abs(placed.x))}, which is ${t}. The other side gives ${mine.kg} times ${num(d)}, which is ${t} as well.` },
      { id: 'f1', kind: 'final', text: `${mine.kg < placed.kg ? 'A lighter weight must sit farther out.' : 'A heavier weight can sit closer in.'} ${END}` },
    ];
  }
  const w = weights[0];
  const d = Math.abs(w.x);
  const c = Math.abs(plank!.x);
  const centreRight = plank!.x > 0;
  const longSide = centreRight ? 'right' : 'left';
  const shortSide = centreRight ? 'left' : 'right';
  const length = p.params.a + p.params.b;
  const tp = plank!.kg * c;
  const tw = w.kg * d;
  return [
    { id: 'h1', kind: 'hook', text: `A uniform plank, ${length} meters long and weighing ${kgs(plank!.kg)}, rests on a pivot ${meters(c)} off center, so the ${longSide} side is the long one. On the short ${shortSide} side, a ${w.kg} kilogram weight sits ${meters(d)} from the pivot.` },
    { id: 'h2', kind: 'hook', text: 'Which side goes down, or does it balance?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: net === 0 ? 'It balances.' : `The ${net > 0 ? 'right' : 'left'} side goes down.` },
    { id: 's2', kind: 'step', step: 2, text: `The plank's own weight acts at its middle, ${meters(c)} from the pivot on the long side. That gives ${plank!.kg} times ${num(c)}, which is ${num(tp)}. The weight gives ${w.kg} times ${d}, which is ${tw}. ${net === 0 ? 'They are equal, so it balances.' : tp > tw ? 'The plank wins, so the long side goes down.' : 'The weight wins, so the short side goes down.'}` },
    { id: 'f1', kind: 'final', text: `A plank's own weight counts, as if it all sat at its middle. ${END}` },
  ];
}

export const seesaw: Family<SeesawParams> = { id: 'seesaw', generate, narrate };
