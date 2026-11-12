import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export type Variant = 'jugs' | 'river-classic' | 'cannibals' | 'torch-bridge' | 'hanoi-moves' | 'hanoi-time';

export interface MovesParams {
  variant: Variant;
  /** Spoken text, one per solver step. */
  steps: string[];
  /** Working rows for the Work panel (hanoi-time only). */
  rows?: string[];
  fact: string;
  // jugs: states[i] = [litres in A, litres in B] after i steps
  caps?: [number, number];
  target?: number;
  // river-classic: items, states[i] = { left: items on the start bank, boat: 0 start / 1 far }
  items?: string[];
  // cannibals
  good?: string;
  bad?: string;
  total?: number;
  boat?: number;
  // torch-bridge
  times?: number[];
  // hanoi
  n?: number;
  from?: number;
  to?: number;
  groupEnds?: number[];
  secsPerMove?: number;
  /** Generic state list: one entry per state along the optimal path (index 0 = start). */
  states?: any[];
  /** Which state index each narrated step ends on (hanoi groups several moves in a step). */
  stepState?: number[];
}

type R = ReturnType<typeof rng>;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Breadth-first search. Returns the states and edge labels along a shortest path, or null. */
export function bfs<S, L>(
  start: S,
  key: (s: S) => string,
  next: (s: S) => { to: S; label: L }[],
  goal: (s: S) => boolean,
): { path: S[]; labels: L[] } | null {
  const prev = new Map<string, { from: string; label: L } | null>();
  const states = new Map<string, S>();
  prev.set(key(start), null);
  states.set(key(start), start);
  let frontier: S[] = [start];
  while (frontier.length) {
    const nxt: S[] = [];
    for (const s of frontier) {
      if (goal(s)) {
        const path: S[] = [];
        const labels: L[] = [];
        let k: string | undefined = key(s);
        while (k !== undefined) {
          path.unshift(states.get(k)!);
          const e: { from: string; label: L } | null = prev.get(k)!;
          if (e) labels.unshift(e.label);
          k = e ? e.from : undefined;
        }
        return { path, labels };
      }
      for (const { to, label } of next(s)) {
        const k = key(to);
        if (!prev.has(k)) {
          prev.set(k, { from: key(s), label });
          states.set(k, to);
          nxt.push(to);
        }
      }
    }
    frontier = nxt;
  }
  return null;
}

// ---------- jugs ----------
type Jug = [number, number];
type JugMove = 'fillA' | 'fillB' | 'emptyA' | 'emptyB' | 'pourAB' | 'pourBA';
export function solveJugs(a: number, b: number, t: number) {
  return bfs<Jug, JugMove>(
    [0, 0],
    (s) => s.join(','),
    ([x, y]) => {
      const out: { to: Jug; label: JugMove }[] = [];
      const dAB = Math.min(x, b - y);
      const dBA = Math.min(y, a - x);
      const all: [Jug, JugMove][] = [
        [[a, y], 'fillA'],
        [[x, b], 'fillB'],
        [[0, y], 'emptyA'],
        [[x, 0], 'emptyB'],
        [[x - dAB, y + dAB], 'pourAB'],
        [[x + dBA, y - dBA], 'pourBA'],
      ];
      for (const [to, label] of all) if (to[0] !== x || to[1] !== y) out.push({ to, label });
      return out;
    },
    ([x, y]) => x === t || y === t,
  );
}

function jugs(seed: number, r: R): Puzzle<MovesParams> {
  const cands: { a: number; b: number; t: number; len: number }[] = [];
  for (let a = 3; a <= 9; a++)
    for (let b = a + 1; b <= 13; b++) {
      if (gcd(a, b) !== 1) continue;
      for (let t = 2; t < b; t++) {
        if (t === a) continue;
        const sol = solveJugs(a, b, t);
        if (sol && sol.labels.length >= 5 && sol.labels.length <= 8) cands.push({ a, b, t, len: sol.labels.length });
      }
    }
  const { a, b, t } = r.pick(cands);
  const sol = solveJugs(a, b, t)!;
  const name = (i: number) => `${i === 0 ? a : b} litre jug`;
  const steps = sol.labels.map((m, i) => {
    const [x, y] = sol.path[i + 1];
    let s: string;
    if (m === 'fillA') s = `Fill the ${name(0)}.`;
    else if (m === 'fillB') s = `Fill the ${name(1)}.`;
    else if (m === 'emptyA') s = `Empty the ${name(0)}.`;
    else if (m === 'emptyB') s = `Empty the ${name(1)}.`;
    else if (m === 'pourAB') s = `Pour the ${name(0)} into the ${name(1)}. Now the jugs hold ${x} and ${y}.`;
    else s = `Pour the ${name(1)} into the ${name(0)}. Now the jugs hold ${x} and ${y}.`;
    return i === sol.labels.length - 1 ? `${s} Exactly ${t} litres!` : s;
  });
  const k = sol.labels.length;
  return {
    family: 'moves',
    seed,
    key: `moves:jugs:${a}:${b}:${t}`,
    label: 'Water jug puzzle',
    question: `Measure exactly ${t} litres with a ${a} litre and a ${b} litre jug. Each step fills a jug, empties a jug, or pours one into the other until one is full or empty. What is the fewest number of steps?`,
    answer: `${k} steps`,
    thinkSeconds: 10,
    stepCount: k,
    params: {
      variant: 'jugs',
      steps,
      caps: [a, b],
      target: t,
      states: sol.path,
      fact: `${k} steps is the minimum`,
    },
  };
}

// ---------- river crossing (farmer, boat for one item) ----------
const PREDATORS = ['wolf', 'fox', 'dog', 'tiger'];
const PREY = ['goat', 'goose', 'rabbit', 'sheep'];
const FOODS = ['cabbage', 'corn', 'carrot', 'lettuce'];
interface RiverState { left: number; boat: 0 | 1 }
export function solveRiver(n: number, conflicts: [number, number][], capacity: number) {
  const full = (1 << n) - 1;
  const bad = (mask: number) => conflicts.some(([i, j]) => (mask >> i) & 1 && (mask >> j) & 1);
  return bfs<RiverState, number[]>(
    { left: full, boat: 0 },
    (s) => `${s.left}|${s.boat}`,
    (s) => {
      const side = s.boat === 0 ? s.left : full & ~s.left;
      const out: { to: RiverState; label: number[] }[] = [];
      const here: number[] = [];
      for (let i = 0; i < n; i++) if ((side >> i) & 1) here.push(i);
      const choices: number[][] = [[]];
      if (capacity >= 1) here.forEach((i) => choices.push([i]));
      for (const c of choices) {
        let left = s.left;
        for (const i of c) left = s.boat === 0 ? left & ~(1 << i) : left | (1 << i);
        const farSide = s.boat === 0 ? left : full & ~left; // bank the farmer left behind
        const behind = s.boat === 0 ? left : full & ~left;
        void farSide;
        if (bad(behind)) continue;
        out.push({ to: { left, boat: (1 - s.boat) as 0 | 1 }, label: c });
      }
      return out;
    },
    (s) => s.left === 0,
  );
}

function riverClassic(seed: number, r: R): Puzzle<MovesParams> {
  const pred = r.pick(PREDATORS);
  const prey = r.pick(PREY);
  const food = r.pick(FOODS);
  const items = [pred, prey, food];
  const sol = solveRiver(3, [[0, 1], [1, 2]], 1)!;
  const steps = sol.labels.map((c, i) => {
    const fwd = sol.path[i].boat === 0;
    if (c.length === 0) return fwd ? 'The farmer crosses alone.' : 'The farmer goes back alone.';
    return fwd ? `Take the ${items[c[0]]} across.` : `Bring the ${items[c[0]]} back.`;
  });
  const k = steps.length;
  return {
    family: 'moves',
    seed,
    key: `moves:river-classic:${pred}:${prey}:${food}`,
    label: 'River crossing',
    question: `A farmer must get a ${pred}, a ${prey} and a ${food} across a river. What is the fewest number of crossings? The boat carries the farmer and one item. The ${pred} eats the ${prey}, and the ${prey} eats the ${food}, if left alone together.`,
    answer: `${k} crossings`,
    thinkSeconds: 10,
    stepCount: k,
    params: { variant: 'river-classic', steps, items, states: sol.path, fact: `${k} crossings is the minimum` },
  };
}

// ---------- missionaries and cannibals style ----------
const THEMES: [string, string][] = [['monk', 'bandit'], ['explorer', 'ogre'], ['chef', 'goblin'], ['sailor', 'pirate'], ['knight', 'troll']];
interface CanState { g: number; b: number; boat: 0 | 1 }
export function solveCannibals(n: number, capacity: number) {
  const ok = (g: number, b: number) => (g === 0 || g >= b) && (n - g === 0 || n - g >= n - b);
  return bfs<CanState, [number, number]>(
    { g: n, b: n, boat: 0 },
    (s) => `${s.g},${s.b},${s.boat}`,
    (s) => {
      const out: { to: CanState; label: [number, number] }[] = [];
      const hg = s.boat === 0 ? s.g : n - s.g;
      const hb = s.boat === 0 ? s.b : n - s.b;
      for (let dg = 0; dg <= Math.min(hg, capacity); dg++)
        for (let db = 0; db <= Math.min(hb, capacity - dg); db++) {
          if (dg + db === 0) continue;
          const sign = s.boat === 0 ? -1 : 1;
          const g = s.g + sign * dg;
          const b = s.b + sign * db;
          if (ok(g, b)) out.push({ to: { g, b, boat: (1 - s.boat) as 0 | 1 }, label: [dg, db] });
        }
      return out;
    },
    (s) => s.g === 0 && s.b === 0,
  );
}
const plural = (w: string, k: number) => (k === 1 ? w : `${w}s`);

function cannibals(seed: number, r: R): Puzzle<MovesParams> {
  const combos: [number, number, number][] = [];
  for (let n = 2; n <= 5; n++)
    for (let c = 2; c <= 4; c++) {
      const sol = solveCannibals(n, c);
      if (sol && sol.labels.length >= 5 && sol.labels.length <= 11) combos.push([n, c, sol.labels.length]);
    }
  const [n, c] = r.pick(combos);
  const [good, bad] = r.pick(THEMES);
  const sol = solveCannibals(n, c)!;
  const steps = sol.labels.map(([dg, db], i) => {
    const parts: string[] = [];
    if (dg) parts.push(`${dg} ${plural(good, dg)}`);
    if (db) parts.push(`${db} ${plural(bad, db)}`);
    const who = parts.join(' and ');
    const one = dg + db === 1;
    return sol.path[i].boat === 0 ? `${cap(who)} ${one ? 'crosses' : 'cross'}.` : `${cap(who)} ${one ? 'returns' : 'return'}.`;
  });
  const k = steps.length;
  return {
    family: 'moves',
    seed,
    key: `moves:cannibals:${good}:${bad}:${n}:${c}`,
    label: 'Dangerous crossing',
    question: `Get ${n} ${good}s and ${n} ${bad}s across a river in the fewest crossings. The boat holds ${c} and needs at least one rower. Wherever there are ${good}s, ${bad}s must never outnumber them.`,
    answer: `${k} crossings`,
    thinkSeconds: 10,
    stepCount: k,
    params: { variant: 'cannibals', steps, good, bad, total: n, boat: c, states: sol.path, fact: `${k} crossings is the minimum` },
  };
}

// ---------- torch and bridge ----------
interface TorchState { left: number; torch: 0 | 1 }
/** Cheapest way for everyone to cross (Dijkstra over states). Returns the path, edge labels and total time. */
export function solveTorch(times: number[]) {
  const n = times.length;
  const full = (1 << n) - 1;
  const key = (s: TorchState) => `${s.left}|${s.torch}`;
  const dist = new Map<string, number>();
  const prev = new Map<string, { from: TorchState; label: number[] } | null>();
  const states = new Map<string, TorchState>();
  const start: TorchState = { left: full, torch: 0 };
  dist.set(key(start), 0);
  prev.set(key(start), null);
  states.set(key(start), start);
  const open: TorchState[] = [start];
  const done = new Set<string>();
  while (open.length) {
    open.sort((x, y) => dist.get(key(x))! - dist.get(key(y))!);
    const s = open.shift()!;
    const ks = key(s);
    if (done.has(ks)) continue;
    done.add(ks);
    if (s.left === 0) {
      const path: TorchState[] = [];
      const labels: number[][] = [];
      let k: string | undefined = ks;
      while (k !== undefined) {
        path.unshift(states.get(k)!);
        const e: { from: TorchState; label: number[] } | null = prev.get(k)!;
        if (e) labels.unshift(e.label);
        k = e ? key(e.from) : undefined;
      }
      return { path, labels, total: dist.get(ks)! };
    }
    const side = s.torch === 0 ? s.left : full & ~s.left;
    const here: number[] = [];
    for (let i = 0; i < n; i++) if ((side >> i) & 1) here.push(i);
    const groups: number[][] = here.map((i) => [i]);
    for (let a = 0; a < here.length; a++) for (let b = a + 1; b < here.length; b++) groups.push([here[a], here[b]]);
    for (const g of groups) {
      let left = s.left;
      for (const i of g) left = s.torch === 0 ? left & ~(1 << i) : left | (1 << i);
      const to: TorchState = { left, torch: (1 - s.torch) as 0 | 1 };
      const cost = dist.get(ks)! + Math.max(...g.map((i) => times[i]));
      const kt = key(to);
      if (!dist.has(kt) || cost < dist.get(kt)!) {
        dist.set(kt, cost);
        prev.set(kt, { from: s, label: g });
        states.set(kt, to);
        open.push(to);
      }
    }
  }
  return null;
}

function torchBridge(seed: number, r: R): Puzzle<MovesParams> {
  for (let tries = 0; tries < 5000; tries++) {
    const times = r.shuffle(Array.from({ length: 12 }, (_, i) => i + 1)).slice(0, 4).sort((x, y) => x - y);
    const escort = times[1] + times[2] + times[3] + 2 * times[0];
    const sol = solveTorch(times)!;
    if (sol.total >= escort || sol.labels.length > 5) continue;
    const steps: string[] = [];
    let clock = 0;
    sol.labels.forEach((g, i) => {
      const cost = Math.max(...g.map((x) => times[x]));
      clock += cost;
      if (sol.path[i].torch === 0) {
        const who = g.length === 1 ? `The ${times[g[0]]} minute walker crosses` : `The ${times[g[0]]} and ${times[g[1]]} minute walkers cross`;
        steps.push(`${who}, taking ${cost} minutes. Total so far, ${clock} minutes.`);
      } else {
        steps.push(`The ${times[g[0]]} minute walker takes the torch back, ${cost} ${cost === 1 ? 'minute' : 'minutes'}. Total so far, ${clock} minutes.`);
      }
    });
    return {
      family: 'moves',
      seed,
      key: `moves:torch-bridge:${times.join('-')}`,
      label: 'Bridge at night',
      question: `Four people, one torch, one bridge. What is the fastest crossing? They take ${times[0]}, ${times[1]}, ${times[2]} and ${times[3]} minutes to cross. The bridge holds two at a time, and the torch must go with them.`,
      answer: `${sol.total} minutes`,
      thinkSeconds: 10,
      stepCount: steps.length,
      params: { variant: 'torch-bridge', steps, times, states: sol.path, fact: `${sol.total} minutes, not ${escort}`, target: sol.total },
    };
  }
  throw new Error('no torch instance');
}

// ---------- tower of hanoi ----------
/** State = peg of each disk (index 0 is the smallest disk). */
export function solveHanoi(n: number, from: number, to: number) {
  return bfs<number[], number>(
    Array(n).fill(from),
    (s) => s.join(''),
    (s) => {
      const tops: number[] = [-1, -1, -1];
      for (let d = n - 1; d >= 0; d--) tops[s[d]] = d;
      const out: { to: number[]; label: number }[] = [];
      for (let p = 0; p < 3; p++)
        for (let q = 0; q < 3; q++) {
          if (p === q || tops[p] < 0 || (tops[q] >= 0 && tops[q] < tops[p])) continue;
          const nx = [...s];
          nx[tops[p]] = q;
          out.push({ to: nx, label: tops[p] });
        }
      return out;
    },
    (s) => s.every((p) => p === to),
  );
}

const distCache = new Map<number, number>();
/** Fewest moves for n disks, by search over all 3^n states. */
export function hanoiDistance(n: number): number {
  const hit = distCache.get(n);
  if (hit !== undefined) return hit;
  const size = 3 ** n;
  const dist = new Int32Array(size).fill(-1);
  const pw = Array.from({ length: n }, (_, i) => 3 ** i);
  dist[0] = 0;
  let frontier = [0];
  const goal = size - 1; // every disk on peg 2
  while (frontier.length && dist[goal] < 0) {
    const nxt: number[] = [];
    for (const s of frontier) {
      const tops = [-1, -1, -1];
      for (let d = n - 1; d >= 0; d--) tops[Math.floor(s / pw[d]) % 3] = d;
      for (let p = 0; p < 3; p++)
        for (let q = 0; q < 3; q++) {
          if (p === q || tops[p] < 0 || (tops[q] >= 0 && tops[q] < tops[p])) continue;
          const t = s + (q - p) * pw[tops[p]];
          if (dist[t] < 0) {
            dist[t] = dist[s] + 1;
            nxt.push(t);
          }
        }
    }
    frontier = nxt;
  }
  distCache.set(n, dist[goal]);
  return dist[goal];
}

const PEGS = ['left', 'middle', 'right'];
function hanoiMoves(seed: number, r: R): Puzzle<MovesParams> {
  const n = r.int(3, 7);
  const from = r.int(0, 2);
  let to = r.int(0, 1);
  if (to >= from) to++;
  const sol = solveHanoi(n, from, to)!;
  const total = sol.labels.length;
  const big = sol.labels.indexOf(n - 1); // the move that carries the biggest disk
  const g1 = big;
  const spare = 3 - from - to;
  const steps = [
    `First, the top ${n - 1} disks shuffle onto the ${PEGS[spare]} peg. That takes ${g1} moves.`,
    'Now the biggest disk crosses in a single move.',
    `Then the ${n - 1} disks hop on top of it, another ${total - g1 - 1} moves.`,
  ];
  return {
    family: 'moves',
    seed,
    key: `moves:hanoi-moves:${n}:${from}${to}`,
    label: 'Tower of Hanoi',
    question: `Tower of Hanoi with ${n} disks: what is the fewest number of moves? Move one disk at a time, from the ${PEGS[from]} peg to the ${PEGS[to]} peg, and never put a bigger disk on a smaller one.`,
    answer: `${total} moves`,
    thinkSeconds: n >= 6 ? 10 : 8,
    stepCount: 3,
    params: {
      variant: 'hanoi-moves',
      steps,
      n,
      from,
      to,
      states: [Array(n).fill(from), ...sol.path.slice(1)],
      stepState: [g1, g1 + 1, total],
      fact: `${g1} plus 1 plus ${total - g1 - 1} equals ${total}`,
    },
  };
}

const plu = (k: number, w: string) => `${k} ${k === 1 ? w : `${w}s`}`;
export function timeWords(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts: string[] = [];
  if (h) parts.push(plu(h, 'hour'));
  if (m) parts.push(plu(m, 'minute'));
  if (s) parts.push(plu(s, 'second'));
  return parts.join(' ');
}

function hanoiTime(seed: number, r: R): Puzzle<MovesParams> {
  const n = r.int(6, 12);
  const secs = r.pick([1, 2, 5]);
  const d = (k: number) => hanoiDistance(k);
  const M = d(n);
  const total = M * secs;
  const words = timeWords(total);
  const steps = [
    `One disk needs ${d(1)} move.`,
    `Two disks need ${d(2)}.`,
    `Three disks need ${d(3)}.`,
    `Four need ${d(4)}. Each extra disk doubles the moves, plus one.`,
    `So ${n} disks need ${M} moves. At ${plu(secs, 'second')} per move, that is ${words}.`,
  ];
  const rows = [
    `1 disk: ${d(1)} move`,
    `2 disks: ${d(2)} moves`,
    `3 disks: ${d(3)} moves`,
    `4 disks: ${d(4)} moves`,
    `${n} disks: ${M} moves`,
  ];
  return {
    family: 'moves',
    seed,
    key: `moves:hanoi-time:${n}:${secs}`,
    label: 'The doubling tower',
    question: `How long does a ${n} disk Tower of Hanoi take at ${plu(secs, 'second')} per move? Perfect play, no pauses. A bigger disk never goes on a smaller one.`,
    answer: words,
    thinkSeconds: 10,
    stepCount: 5,
    params: { variant: 'hanoi-time', steps, rows, n, secsPerMove: secs, target: M, fact: `${M} moves, ${words}` },
  };
}

function generate(seed: number): Puzzle<MovesParams> {
  const r = rng(seed);
  const v = r.pick<Variant>(['jugs', 'river-classic', 'cannibals', 'torch-bridge', 'hanoi-moves', 'hanoi-time']);
  switch (v) {
    case 'jugs': return jugs(seed, r);
    case 'river-classic': return riverClassic(seed, r);
    case 'cannibals': return cannibals(seed, r);
    case 'torch-bridge': return torchBridge(seed, r);
    case 'hanoi-moves': return hanoiMoves(seed, r);
    default: return hanoiTime(seed, r);
  }
}

function narrate(p: Puzzle<MovesParams>): Line[] {
  const q = p.params;
  const end = 'Follow for a new puzzle every day.';
  let h1: string;
  let h2: string;
  let f1: string;
  const k = q.steps.length;
  switch (q.variant) {
    case 'jugs':
      h1 = `You have a ${q.caps![0]} litre jug and a ${q.caps![1]} litre jug, and no other markings.`;
      h2 = `How few steps does it take to measure exactly ${q.target} litres?`;
      f1 = `That is ${k} steps, and a search of every possible state finds nothing shorter. ${end}`;
      break;
    case 'river-classic':
      h1 = `A farmer must take a ${q.items![0]}, a ${q.items![1]} and a ${q.items![2]} across a river. The boat holds the farmer and one item.`;
      h2 = `The ${q.items![0]} eats the ${q.items![1]}, and the ${q.items![1]} eats the ${q.items![2]}. What is the fewest number of crossings?`;
      f1 = `${k} crossings, and the trick is bringing something back. ${end}`;
      break;
    case 'cannibals':
      h1 = `${q.total} ${q.good}s and ${q.total} ${q.bad}s must cross a river in a boat that holds ${q.boat}.`;
      h2 = `Wherever there are ${q.good}s, the ${q.bad}s must never outnumber them. What is the fewest number of crossings?`;
      f1 = `${k} crossings. A search of every safe arrangement finds nothing shorter. ${end}`;
      break;
    case 'torch-bridge':
      h1 = `Four people must cross a bridge at night. They take ${q.times!.join(', ')} minutes. The bridge holds two, and they share one torch.`;
      h2 = 'Whoever crosses together walks at the slower speed. What is the fastest total time?';
      f1 = `${p.answer}. Sending the two slowest together saves time. ${end}`;
      break;
    case 'hanoi-moves':
      h1 = `A tower of ${q.n} disks sits on the ${PEGS[q.from!]} peg. Move it to the ${PEGS[q.to!]} peg, one disk at a time, never putting a bigger disk on a smaller one.`;
      h2 = 'What is the fewest number of moves?';
      f1 = `${p.answer}. Each extra disk doubles the moves, plus one. ${end}`;
      break;
    default:
      h1 = `A tower of ${q.n} disks must move to another peg, one disk at a time, never putting a bigger disk on a smaller one.`;
      h2 = `Each move takes ${plu(q.secsPerMove!, 'second')}. How long does the whole job take?`;
      f1 = `${p.answer}. Doubling grows faster than it feels. ${end}`;
  }
  const lines: Line[] = [
    { id: 'h1', kind: 'hook', text: h1 },
    { id: 'h2', kind: 'hook', text: h2 },
  ];
  q.steps.forEach((text, i) => lines.push({ id: `s${i}`, kind: 'step', step: i, text }));
  lines.push({ id: 'f1', kind: 'final', text: f1 });
  return lines;
}

export const moves: Family<MovesParams> = { id: 'moves', generate, narrate };
