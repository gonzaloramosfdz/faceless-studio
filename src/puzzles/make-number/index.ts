import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

// ---------- exact fractions ----------
export type Fr = [number, number];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const mk = (n: number, d = 1): Fr => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
};
const OPS = ['+', '-', '*', '/'] as const;
export type Op = (typeof OPS)[number];
const apply = (a: Fr, b: Fr, op: Op): Fr | null => {
  if (op === '+') return mk(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  if (op === '-') return mk(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  if (op === '*') return mk(a[0] * b[0], a[1] * b[1]);
  if (b[0] === 0) return null;
  return mk(a[0] * b[1], a[1] * b[0]);
};
const eq = (a: Fr, n: number) => a[1] === 1 && a[0] === n;
const SYM: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const WORD: Record<Op, string> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' };
const ORD: Record<number, [string, string]> = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['quarter', 'quarters'], 5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'], 7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'], 11: ['eleventh', 'elevenths'], 12: ['twelfth', 'twelfths'], 13: ['thirteenth', 'thirteenths'],
};
/** Spoken form of a fraction, e.g. "8 thirds". Never contains a slash. */
export function say(f: Fr): string {
  const [n, d] = f;
  if (n < 0) return `negative ${say([-n, d])}`;
  if (d === 1) return String(n);
  const o = ORD[d];
  return o ? `${n} ${n === 1 ? o[0] : o[1]}` : `${n} over ${d}`;
}
export const show = (f: Fr) => (f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);

// ---------- 24 solver (exhaustive over every order, operation and bracketing) ----------
export interface Step { a: Fr; b: Fr; op: Op; r: Fr }
interface Node { v: Fr; canon: string; disp: string; prec: number }
export interface Sol { canon: string; disp: string; steps: Step[] }

function combine(a: Node, b: Node, op: Op, v: Fr): Node {
  const prec = op === '+' || op === '-' ? 1 : 2;
  const comm = op === '+' || op === '*';
  const canon = `(${comm ? [a.canon, b.canon].sort().join(op) : a.canon + op + b.canon})`;
  const lp = a.prec < prec;
  const rp = comm ? b.prec < prec : b.prec <= prec;
  const disp = `${lp ? `(${a.disp})` : a.disp} ${SYM[op]} ${rp ? `(${b.disp})` : b.disp}`;
  return { v, canon, disp, prec };
}

export function solve(nums: number[], target: number): Sol[] {
  const found = new Map<string, Sol>();
  const rec = (pool: Node[], steps: Step[]) => {
    if (pool.length === 1) {
      if (eq(pool[0].v, target) && !found.has(pool[0].canon))
        found.set(pool[0].canon, { canon: pool[0].canon, disp: pool[0].disp, steps });
      return;
    }
    for (let i = 0; i < pool.length; i++)
      for (let j = 0; j < pool.length; j++) {
        if (i === j) continue;
        for (const op of OPS) {
          if ((op === '+' || op === '*') && j < i) continue;
          const v = apply(pool[i].v, pool[j].v, op);
          if (!v) continue;
          const rest = pool.filter((_, k) => k !== i && k !== j);
          rec([...rest, combine(pool[i], pool[j], op, v)], [...steps, { a: pool[i].v, b: pool[j].v, op, r: v }]);
        }
      }
  };
  rec(nums.map((n) => ({ v: mk(n), canon: String(n), disp: String(n), prec: 3 })), []);
  return [...found.values()].sort((x, y) => (x.canon < y.canon ? -1 : 1));
}

/** Every value reachable from the numbers (used to prove a set cannot make 24). */
export function reachable(nums: number[]): Set<string> {
  const out = new Set<string>();
  const rec = (pool: Fr[]) => {
    if (pool.length === 1) { out.add(show(pool[0])); return; }
    for (let i = 0; i < pool.length; i++)
      for (let j = 0; j < pool.length; j++) {
        if (i === j) continue;
        for (const op of OPS) {
          const v = apply(pool[i], pool[j], op);
          if (!v) continue;
          rec([...pool.filter((_, k) => k !== i && k !== j), v]);
        }
      }
  };
  rec(nums.map((n) => mk(n)));
  return out;
}

const multisets = (lo: number, hi: number): number[][] => {
  const out: number[][] = [];
  for (let a = lo; a <= hi; a++) for (let b = a; b <= hi; b++) for (let c = b; c <= hi; c++) for (let d = c; d <= hi; d++) out.push([a, b, c, d]);
  return out;
};

let hardCache: { nums: number[]; sol: Sol }[] | null = null;
/** Sets where every solution needs a fraction along the way, exactly one solution, no negative step. */
function hardSets() {
  if (hardCache) return hardCache;
  hardCache = [];
  for (const nums of multisets(1, 13)) {
    const sols = solve(nums, 24);
    if (sols.length !== 1) continue;
    const s = sols[0];
    if (!s.steps.some((st) => st.r[1] !== 1)) continue;
    if (s.steps.some((st) => st.r[0] < 0 || st.a[0] < 0 || st.b[0] < 0)) continue;
    hardCache.push({ nums, sol: s });
  }
  return hardCache;
}

let splitCache: { yes: number[][]; no: number[][] } | null = null;
function splitSets() {
  if (splitCache) return splitCache;
  const yes: number[][] = [], no: number[][] = [];
  for (const nums of multisets(1, 9)) {
    const rs = reachable(nums);
    if (rs.has('24')) yes.push(nums);
    else if ([...rs].some((x) => !x.includes('/') && Number(x) > 24)) no.push(nums);
  }
  splitCache = { yes, no };
  return splitCache;
}

// ---------- other solvers ----------
export interface Way { text: string; words: string; total: number }
/** All ways to put plus, minus or nothing between the digits 1..n (no sign before the first digit). */
export function signWays(n: number): Way[] {
  const out: Way[] = [];
  const gaps = n - 1;
  const total = 3 ** gaps;
  for (let m = 0; m < total; m++) {
    let x = m;
    const nums: number[] = [1];
    const ops: string[] = [];
    for (let g = 0; g < gaps; g++) {
      const c = x % 3; x = Math.floor(x / 3);
      const d = g + 2;
      if (c === 0) nums[nums.length - 1] = nums[nums.length - 1] * 10 + d;
      else { ops.push(c === 1 ? '+' : '-'); nums.push(d); }
    }
    let t = nums[0];
    ops.forEach((o, i) => (t += o === '+' ? nums[i + 1] : -nums[i + 1]));
    let text = String(nums[0]), words = String(nums[0]);
    ops.forEach((o, i) => { text += ` ${o === '+' ? '+' : '−'} ${nums[i + 1]}`; words += ` ${o === '+' ? 'plus' : 'minus'} ${nums[i + 1]}`; });
    out.push({ text, words, total: t });
  }
  return out;
}

/** Totals reachable with a plus or minus in front of each of 1..n. */
export function plusMinusTotals(n: number): Set<number> {
  let s = new Set<number>([0]);
  for (let d = 1; d <= n; d++) { const t = new Set<number>(); s.forEach((x) => { t.add(x + d); t.add(x - d); }); s = t; }
  return s;
}

/** Amounts payable exactly with unlimited coins; returns the largest amount that is not payable below `limit`. */
export function payable(coins: number[], limit: number): boolean[] {
  const ok = new Array(limit + 1).fill(false);
  ok[0] = true;
  for (let v = 1; v <= limit; v++) ok[v] = coins.some((c) => v >= c && ok[v - c]);
  return ok;
}
export const largestMiss = (coins: number[]) => {
  const lim = 400;
  const ok = payable(coins, lim);
  let best = -1;
  for (let v = 1; v <= lim; v++) if (!ok[v]) best = v;
  return best;
};

const rev = (n: number, d: number) => Number(String(n).padStart(d, '0').split('').reverse().join(''));
const digitSum = (n: number) => String(n).split('').reduce((a, b) => a + Number(b), 0);
const first = (n: number) => Number(String(n)[0]);
const last = (n: number) => n % 10;
/** Results of "reverse and subtract" over every d-digit number whose first digit beats its last. */
export function revDiffs(d: number): number[] {
  const out: number[] = [];
  for (let n = 10 ** (d - 1); n < 10 ** d; n++) if (first(n) > last(n)) out.push(n - rev(n, d));
  return out;
}
export function digitDiffs(d: number): number[] {
  const out: number[] = [];
  for (let n = 10 ** (d - 1); n < 10 ** d; n++) out.push(n - digitSum(n));
  return out;
}
const gcdAll = (xs: number[]) => xs.reduce((a, b) => gcd(a, b), 0);

// ---------- puzzle ----------
export type Variant = 'make-24' | 'cannot-make' | 'insert-signs' | 'plus-minus' | 'coins' | 'reverse-subtract' | 'digit-sum';
export interface MakeNumberParams {
  variant: Variant;
  fact: string;
  // make-24
  numbers?: number[];
  rows?: string[];
  pools?: string[][];
  steps?: Step[];
  expr?: string;
  // cannot-make
  sets?: number[][];
  results?: string[];
  // insert-signs / plus-minus
  n?: number;
  target?: number;
  solutions?: string[];
  count?: number;
  examples?: string[];
  total?: number;
  // coins
  coins?: number[];
  theme?: 'coins' | 'game';
  miss?: number;
  gridMax?: number;
  // digit tricks
  digits?: number;
  g?: number;
  sample?: string[];
  mult?: number[];
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const list = (xs: number[]) => (xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function pickOptions(r: ReturnType<typeof rng>, correct: number, pool: number[], fmt: (n: number) => string) {
  const bad = r.shuffle([...new Set(pool)].filter((x) => x !== correct && x > 0)).slice(0, 2);
  const opts = r.shuffle([correct, ...bad]);
  return { options: opts.map(fmt), answerIndex: opts.indexOf(correct) };
}

function make24(seed: number, r: ReturnType<typeof rng>): Puzzle<MakeNumberParams> {
  const hs = hardSets();
  const h = r.pick(hs);
  const nums = r.shuffle(h.nums);
  const sol = h.sol;
  const pools: string[][] = [];
  let pool: Fr[] = nums.map((n) => mk(n));
  const rows: string[] = [];
  sol.steps.forEach((s) => {
    const rm = (f: Fr) => { const i = pool.findIndex((x) => x[0] === f[0] && x[1] === f[1]); pool.splice(i, 1); };
    rm(s.a); rm(s.b); pool = [...pool, s.r];
    pools.push(pool.map(show));
    rows.push(`${show(s.a)} ${SYM[s.op]} ${show(s.b)} = ${show(s.r)}`);
  });
  const key = `make-number:make-24:${[...h.nums].join('-')}`;
  return {
    family: 'make-number', seed, key,
    label: 'Make 24',
    question: `Make 24 from ${nums.slice(0, 3).join(', ')} and ${nums[3]}. Use each number once, with plus, minus, times, divide and brackets.`,
    answer: `${sol.disp} = 24`,
    thinkSeconds: 10, stepCount: 3,
    params: { variant: 'make-24', numbers: nums, rows, pools, steps: sol.steps, expr: sol.disp, fact: 'Every solution needs a fraction' },
  };
}

function cannotMake(seed: number, r: ReturnType<typeof rng>): Puzzle<MakeNumberParams> {
  const { yes, no } = splitSets();
  const bad = r.pick(no);
  const g1 = r.pick(yes);
  let g2 = r.pick(yes);
  while (g2.join() === g1.join()) g2 = r.pick(yes);
  const sets = r.shuffle([bad, g1, g2]);
  const answerIndex = sets.findIndex((s) => s === bad);
  const results = sets.map((s) => (s === bad ? 'no way' : solve(s, 24)[0].disp));
  return {
    family: 'make-number', seed,
    key: `make-number:cannot-make:${sets.map((s) => s.join('')).join('|')}`,
    label: 'One set cannot',
    question: `One of these sets can never make 24. Which one? Use each number once, with plus, minus, times, divide and brackets.`,
    options: ['Set A', 'Set B', 'Set C'], answerIndex,
    answer: `Set ${'ABC'[answerIndex]}`,
    thinkSeconds: 10, stepCount: 3,
    params: { variant: 'cannot-make', sets, results, fact: 'Every order and bracket was checked' },
  };
}

let waysCache: Record<number, Way[]> = {};
function insertSigns(seed: number, r: ReturnType<typeof rng>): Puzzle<MakeNumberParams> {
  const n = r.pick([6, 7, 8, 9]);
  const ways = (waysCache[n] ??= signWays(n));
  const byT = new Map<number, Way[]>();
  ways.forEach((w) => byT.set(w.total, [...(byT.get(w.total) ?? []), w]));
  const targets = [...byT.entries()].filter(([t, w]) => w.length >= 3 && w.length <= 14 && t >= 5).map(([t]) => t).sort((a, b) => a - b);
  const target = r.pick(targets);
  const sols = byT.get(target)!;
  const count = sols.length;
  const { options, answerIndex } = pickOptions(r, count, [count - 3, count - 2, count - 1, count + 1, count + 2, count + 3, count + 4], (x) => `${x} ways`);
  const digits = Array.from({ length: n }, (_, i) => i + 1).join(' ');
  return {
    family: 'make-number', seed,
    key: `make-number:insert-signs:${n}:${target}`,
    label: 'Sign puzzle',
    question: `How many ways can ${digits} make ${target}? Put a plus, a minus or nothing between the digits, so 1 and 2 can join to make 12.`,
    options, answerIndex, answer: options[answerIndex],
    thinkSeconds: 10, stepCount: 3,
    params: { variant: 'insert-signs', n, target, count, solutions: sols.slice(0, 4).map((w) => w.text), fact: `${3 ** (n - 1)} combinations checked` },
  };
}

function plusMinus(seed: number, r: ReturnType<typeof rng>): Puzzle<MakeNumberParams> {
  const n = r.pick([5, 6, 7, 8, 9, 10]);
  const S = (n * (n + 1)) / 2;
  const tot = plusMinusTotals(n);
  const same = (x: number) => (x - S) % 2 === 0;
  const good = r.pick(Array.from({ length: S - 3 }, (_, i) => i + 2).filter(same));
  const wrongParity = r.pick(Array.from({ length: S - 3 }, (_, i) => i + 2).filter((x) => !same(x)));
  const tooBig = S + 2 * r.int(1, 3);
  const vals = r.shuffle([good, wrongParity, tooBig]);
  const reach = vals.map((v) => tot.has(v));
  if (reach.filter(Boolean).length !== 1) throw new Error('plus-minus not unique');
  const answerIndex = reach.indexOf(true);
  const digits = Array.from({ length: n }, (_, i) => i + 1).join(' ');
  // examples: random sign patterns, all with the same parity
  const examples: string[] = [];
  for (let k = 0; k < 4; k++) {
    let t = 0;
    const parts = Array.from({ length: n }, (_, i) => { const neg = r.next() < 0.45; t += neg ? -(i + 1) : i + 1; return `${neg ? '−' : '+'}${i + 1}`; });
    examples.push(`${parts.join(' ')} = ${t}`);
  }
  return {
    family: 'make-number', seed,
    key: `make-number:plus-minus:${n}:${vals.join('-')}`,
    label: 'Plus or minus?',
    question: `Which total can ${digits} make? Put a plus or a minus in front of every digit, the first one too.`,
    options: vals.map(String), answerIndex, answer: String(vals[answerIndex]),
    thinkSeconds: 10, stepCount: 3,
    params: { variant: 'plus-minus', n, total: S, examples, fact: 'Flipping a sign changes the total by an even number' },
  };
}

function coins(seed: number, r: ReturnType<typeof rng>): Puzzle<MakeNumberParams> {
  for (;;) {
    const k = r.next() < 0.6 ? 2 : 3;
    const cs = [...new Set(Array.from({ length: k }, () => r.int(3, 13)))].sort((a, b) => a - b);
    if (cs.length !== k || gcdAll(cs) !== 1) continue;
    const miss = largestMiss(cs);
    if (miss < 7 || miss > 44) continue;
    const theme = r.next() < 0.5 ? 'coins' : 'game';
    const { options, answerIndex } = pickOptions(r, miss, [miss - 4, miss - 3, miss - 2, miss - 1, miss + 1, miss + 2, miss + 3, miss + 5, cs[0] * cs[cs.length - 1]], String);
    const question =
      theme === 'coins'
        ? `What is the largest amount you can't pay with ${list(cs)} coins? You have as many coins of each kind as you like.`
        : `What is the largest score you can never reach exactly? Each move scores ${cs.join(' or ')} points.`;
    return {
      family: 'make-number', seed,
      key: `make-number:coins:${theme}:${cs.join('-')}`,
      label: 'Impossible amount',
      question, options, answerIndex, answer: options[answerIndex],
      thinkSeconds: 10, stepCount: 3,
      params: { variant: 'coins', coins: cs, theme, miss, gridMax: miss + cs[0], fact: `Every amount above ${miss} works` },
    };
  }
}

function digitTrick(seed: number, r: ReturnType<typeof rng>, variant: 'reverse-subtract' | 'digit-sum'): Puzzle<MakeNumberParams> {
  const d = variant === 'reverse-subtract' ? r.pick([2, 3, 3, 3, 4, 5]) : r.pick([2, 3, 3, 4]);
  const diffs = variant === 'reverse-subtract' ? revDiffs(d) : digitDiffs(d);
  const g = gcdAll(diffs);
  const pick = (): number => {
    for (;;) {
      const n = r.int(10 ** (d - 1) + 1, 10 ** d - 1);
      if (variant === 'reverse-subtract' && !(first(n) > last(n) && last(n) !== 0)) continue;
      if (variant === 'digit-sum' && n % 10 === 0) continue;
      return n;
    }
  };
  const ns = new Set<number>();
  while (ns.size < 3) ns.add(pick());
  const mults = [...ns].map((n) => (variant === 'reverse-subtract' ? n - rev(n, d) : n - digitSum(n)) / g);
  const sample = [...ns].map((n) =>
    variant === 'reverse-subtract'
      ? `${n} − ${rev(n, d)} = ${n - rev(n, d)}`
      : `${n} − (${String(n).split('').join('+')}) = ${n - digitSum(n)}`,
  );
  const x = [...ns][0];
  const cands = [g / 3, g * 2, g * 3, g + g / 3];
  const { options, answerIndex } = pickOptions(r, g, [cands[0], r.pick(cands.slice(1))], String);
  const question =
    variant === 'reverse-subtract'
      ? `Take a ${d}-digit number whose first digit is bigger than its last. Reverse it and subtract, like ${x} − ${rev(x, d)}. The answer is always a multiple of what? Pick the biggest.`
      : `Take a ${d}-digit number and subtract the sum of its digits, like ${x} minus ${digitSum(x)}. The answer is always a multiple of what? Pick the biggest.`;
  return {
    family: 'make-number', seed,
    key: `make-number:${variant}:${d}:${x}`,
    label: 'Number trick',
    question, options, answerIndex, answer: options[answerIndex],
    thinkSeconds: 8, stepCount: 3,
    params: { variant, digits: d, g, sample, mult: mults, fact: `Every result is a multiple of ${g}` },
  };
}

function generate(seed: number): Puzzle<MakeNumberParams> {
  const r = rng(seed);
  const v = r.pick(['make-24', 'cannot-make', 'insert-signs', 'plus-minus', 'coins', 'reverse-subtract', 'digit-sum'] as Variant[]);
  if (v === 'make-24') return make24(seed, r);
  if (v === 'cannot-make') return cannotMake(seed, r);
  if (v === 'insert-signs') return insertSigns(seed, r);
  if (v === 'plus-minus') return plusMinus(seed, r);
  if (v === 'coins') return coins(seed, r);
  return digitTrick(seed, r, v);
}

const END = 'Follow for a new puzzle every day.';
const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now watch.' };

const REV_WHY: Record<number, string> = {
  2: 'Ten a plus b, minus ten b plus a, leaves 9 times the gap between a and b.',
  3: 'A number with digits a, b, c is 100 a plus 10 b plus c. Reversed it is 100 c plus 10 b plus a. The difference is 99 times the gap between a and c.',
  4: 'Reversing swaps the place values 1000 and 1, and 100 and 10. Their gaps are 999 and 90, and both are multiples of 9.',
  5: 'Reversing swaps the place values 10000 and 1, and 1000 and 10. Their gaps are 9999 and 990, and both are multiples of 99.',
};

function narrate(p: Puzzle<MakeNumberParams>): Line[] {
  const q = p.params;
  if (q.variant === 'make-24') {
    const st = q.steps!;
    const nums = q.numbers!;
    const lines: Line[] = [
      { id: 'h1', kind: 'hook', text: `Make 24 from ${nums.slice(0, 3).join(', ')} and ${nums[3]}. Use each number once.` },
      { id: 'h2', kind: 'hook', text: 'You can use plus, minus, times, divided by and brackets. Careful, it is a tricky one.' },
    ];
    st.forEach((s, i) => {
      let t = `${cap(say(s.a))} ${WORD[s.op]} ${say(s.b)} equals ${say(s.r)}.`;
      if (i === 0) t = `Every solution needs a fraction. Start with ${say(s.a)} ${WORD[s.op]} ${say(s.b)}, which is ${say(s.r)}.`;
      else if (i === 1) t = `Now ${say(s.a)} ${WORD[s.op]} ${say(s.b)} equals ${say(s.r)}.`;
      else if (s.op === '/' && s.b[0] === 1 && s.b[1] > 1)
        t = `Finally ${say(s.a)} divided by ${say(s.b)} equals ${say(s.r)}, because dividing by ${say(s.b)} is the same as multiplying by ${s.b[1]}.`;
      else t = `Finally ${say(s.a)} ${WORD[s.op]} ${say(s.b)} equals ${say(s.r)}.`;
      lines.push({ id: `s${i}`, kind: 'step', step: i, text: t });
    });
    lines.push({ id: 'f1', kind: 'final', text: `Whole numbers alone cannot do it, but a fraction in the middle can. ${END}` });
    return lines;
  }
  if (q.variant === 'cannot-make') {
    const [a, b, c] = q.sets!;
    const bad = 'ABC'[p.answerIndex!];
    return [
      { id: 'h1', kind: 'hook', text: `Set A is ${a.join(', ')}. Set B is ${b.join(', ')}. Set C is ${c.join(', ')}.` },
      { id: 'h2', kind: 'hook', text: 'Use each number once, with plus, minus, times, divided by and brackets. One set can never make 24. Which one?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Set ${bad} can never make 24.` },
      { id: 's2', kind: 'step', step: 2, text: 'A search tried every order, every operation and every placement of brackets. The other two sets each have a way, shown on screen.' },
      { id: 'f1', kind: 'final', text: `Proving something is impossible means checking everything. ${END}` },
    ];
  }
  if (q.variant === 'insert-signs') {
    const n = q.n!;
    return [
      { id: 'h1', kind: 'hook', text: `Take the digits 1 to ${n} in order. Put a plus, a minus or nothing between each pair, so 1 and 2 can join into 12.` },
      { id: 'h2', kind: 'hook', text: `How many different ways give a total of ${q.target}?` },
      run,
      { id: 's1', kind: 'step', step: 1, text: `There are exactly ${q.count} ways. One of them is ${signWays(n).find((w) => w.text === q.solutions![0])!.words}.` },
      { id: 's2', kind: 'step', step: 2, text: `Each of the ${n - 1} gaps has 3 choices, so there are ${3 ** (n - 1)} combinations. A computer checked them all, and ${q.count} reach ${q.target}.` },
      { id: 'f1', kind: 'final', text: `Small choices multiply fast. ${END}` },
    ];
  }
  if (q.variant === 'plus-minus') {
    const n = q.n!;
    return [
      { id: 'h1', kind: 'hook', text: `Take the digits 1 to ${n}. Put a plus or a minus in front of every one, the first included.` },
      { id: 'h2', kind: 'hook', text: 'Which of these totals is possible?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `Only ${p.answer} can be reached.` },
      { id: 's2', kind: 'step', step: 2, text: `With every sign plus the total is ${q.total}. Turning a plus into a minus changes the total by twice that digit, always an even number. So the total keeps its parity and never goes above ${q.total}.` },
      { id: 'f1', kind: 'final', text: `Parity never changes when you move in even steps. ${END}` },
    ];
  }
  if (q.variant === 'coins') {
    const cs = q.coins!;
    const hook =
      q.theme === 'coins'
        ? `You have as many coins as you like, worth ${list(cs)}.`
        : `A game gives ${cs.join(' or ')} points for each move.`;
    return [
      { id: 'h1', kind: 'hook', text: hook },
      { id: 'h2', kind: 'hook', text: q.theme === 'coins' ? 'What is the largest amount you cannot pay exactly?' : 'What is the largest score you can never reach exactly?' },
      run,
      { id: 's1', kind: 'step', step: 1, text: `The answer is ${q.miss}.` },
      { id: 's2', kind: 'step', step: 2, text: `A search checked every amount one by one. ${q.miss} is the last one that fails, and after it every amount works, because the smallest ${q.theme === 'coins' ? 'coin' : 'move'} then keeps filling the gaps.` },
      { id: 'f1', kind: 'final', text: `Past a certain point, nothing is impossible. ${END}` },
    ];
  }
  const rs = q.variant === 'reverse-subtract';
  return [
    { id: 'h1', kind: 'hook', text: rs ? `Pick a ${q.digits}-digit number whose first digit is bigger than its last. Reverse its digits and subtract.` : `Pick a ${q.digits}-digit number and subtract the sum of its digits.` },
    { id: 'h2', kind: 'hook', text: 'The answer is always a multiple of something big. What is the biggest such number?' },
    run,
    { id: 's1', kind: 'step', step: 1, text: `It is always a multiple of ${q.g}. Check the examples.` },
    { id: 's2', kind: 'step', step: 2, text: rs ? REV_WHY[q.digits!] : 'Each place value is a multiple of nine plus one: 10 is 9 plus 1, and 100 is 99 plus 1. The digit sum takes away that extra one for every digit, leaving only multiples of nine.' },
    { id: 'f1', kind: 'final', text: `A computer checked every number and found nothing larger that always works. ${END}` },
  ];
}

export const makeNumber: Family<MakeNumberParams> = { id: 'make-number', generate, narrate };
