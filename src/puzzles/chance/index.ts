import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

// ---------- exact fractions (BigInt) ----------
export type Frac = [bigint, bigint];
const babs = (a: bigint) => (a < 0n ? -a : a);
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? babs(a) : gcd(b, a % b));
export const mk = (n: bigint | number, d: bigint | number): Frac => {
  let N = BigInt(n);
  let D = BigInt(d);
  if (D < 0n) {
    N = -N;
    D = -D;
  }
  const g = gcd(N, D) || 1n;
  return [N / g, D / g];
};
const fadd = (a: Frac, b: Frac) => mk(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fsub = (a: Frac, b: Frac) => mk(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fmul = (a: Frac, b: Frac) => mk(a[0] * b[0], a[1] * b[1]);
const fdiv = (a: Frac, b: Frac) => mk(a[0] * b[1], a[1] * b[0]);
export const feq = (a: Frac, b: Frac) => a[0] * b[1] === b[0] * a[1];
export const ftext = (f: Frac) => `${f[0]}/${f[1]}`;
const roundDiv = (n: bigint, d: bigint) => (2n * n + d) / (2n * d);
const tenths = (f: Frac) => Number(roundDiv(f[0] * 1000n, f[1]));
export const pctText = (f: Frac) => {
  const t = tenths(f);
  return t % 10 === 0 ? `${t / 10}%` : `${(t / 10).toFixed(1)}%`;
};
const pctSpoken = (f: Frac, decimals = 0) => {
  const exact = 100n % f[1] === 0n;
  const v = decimals ? (tenths(f) / 10).toFixed(1) : String(Number(roundDiv(f[0] * 100n, f[1])));
  return `${exact ? 'exactly' : 'about'} ${v} percent`;
};
const spoken = (f: Frac) => (feq(f, mk(1, 2)) ? 'one half' : `${f[0]} out of ${f[1]}`);

const END = 'Follow for a new puzzle every day.';
const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const words = (n: number) => (n <= 20 ? W[n] : String(n));
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---------- exact solvers ----------
/** Monty Hall by enumerating every (car, pick, remaining closed door) case with its exact weight. */
export function montyExact(N: number, mode: 'know' | 'fall'): { stay: Frac; swap: Frac } {
  let stay = 0n, swap = 0n, total = 0n;
  for (let car = 0; car < N; car++)
    for (let pick = 0; pick < N; pick++)
      for (let rem = 0; rem < N; rem++) {
        if (rem === pick) continue;
        let w: bigint;
        if (mode === 'know') {
          // Host knows: if the pick is right he chooses which door to leave closed (N-1 ways); otherwise it is forced.
          if (pick !== car && rem !== car) continue;
          w = pick === car ? 1n : BigInt(N - 1);
        } else {
          // Host opens at random and happens to show only goats: car must be the pick or the closed door.
          if (car !== pick && car !== rem) continue;
          w = 1n;
        }
        total += w;
        if (car === pick) stay += w;
        if (car === rem) swap += w;
      }
  return { stay: mk(stay, total), swap: mk(swap, total) };
}

/** Birthday: smallest-n search and exact probability via a count of distinct-day states. */
export function birthdayShared(n: number, D: number): Frac {
  let ways: bigint[] = [1n]; // ways[k] = assignments of people so far using k distinct days
  for (let i = 0; i < n; i++) {
    const next: bigint[] = new Array(ways.length + 1).fill(0n);
    ways.forEach((w, k) => {
      next[k] += w * BigInt(k);
      next[k + 1] += w * BigInt(Math.max(0, D - k));
    });
    ways = next;
  }
  const all = BigInt(D) ** BigInt(n);
  return mk(all - (ways[n] ?? 0n), all);
}
export function birthdayThreshold(t: Frac, D: number): number {
  for (let n = 2; n <= D + 1; n++) {
    const p = birthdayShared(n, D);
    if (p[0] * t[1] > t[0] * p[1]) return n;
  }
  throw new Error('no threshold');
}

/** Penney's game: exact chance that A appears before B, solving the Markov chain with exact fractions. */
export function coinExact(A: string, B: string): Frac {
  const states = ['', 'H', 'T', 'HH', 'HT', 'TH', 'TT'];
  const n = states.length;
  const M: Frac[][] = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => mk(0, 1)));
  states.forEach((s, i) => {
    M[i][i] = mk(1, 1);
    for (const c of ['H', 'T']) {
      const t = s + c;
      if (t.endsWith(A)) M[i][n] = fadd(M[i][n], mk(1, 2));
      else if (t.endsWith(B)) continue;
      else {
        const j = states.indexOf(t.slice(-2));
        M[i][j] = fsub(M[i][j], mk(1, 2));
      }
    }
  });
  for (let c = 0; c < n; c++) {
    let piv = c;
    while (M[piv][c][0] === 0n) piv++;
    [M[c], M[piv]] = [M[piv], M[c]];
    const inv = M[c][c];
    M[c] = M[c].map((v) => fdiv(v, inv));
    for (let r = 0; r < n; r++) {
      if (r === c || M[r][c][0] === 0n) continue;
      const f = M[r][c];
      M[r] = M[r].map((v, j) => fsub(v, fmul(f, M[c][j])));
    }
  }
  return M[0][n];
}

export function diceStats(a: number[], b: number[]) {
  let aw = 0, bw = 0, ties = 0;
  for (const x of a) for (const y of b) x > y ? aw++ : x < y ? bw++ : ties++;
  return { aw, bw, ties };
}

// ---------- seeded games (shared by the tally and the board) ----------
const gameRng = (seed: number, g: number, salt: number) => rng((seed * salt + g * 104729) >>> 0);
export function birthdayGame(seed: number, g: number, n: number, D: number) {
  const r = gameRng(seed, g, 7919);
  const seen = new Set<number>();
  const dup = new Set<number>();
  const days: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = r.int(0, D - 1);
    if (seen.has(d)) dup.add(d);
    seen.add(d);
    days.push(d);
  }
  return { days, dup: [...dup] };
}
export function coinGame(seed: number, g: number, A: string, B: string) {
  const r = gameRng(seed, g, 6151);
  let s = '';
  for (;;) {
    s += r.next() < 0.5 ? 'H' : 'T';
    if (s.endsWith(A)) return { flips: s, winner: 0 };
    if (s.endsWith(B)) return { flips: s, winner: 1 };
  }
}
export function diceRoll(seed: number, g: number) {
  const r = gameRng(seed, g, 4241);
  return { ia: r.int(0, 5), ib: r.int(0, 5) };
}

// ---------- params ----------
export interface Bar {
  label: string;
  exact: string;
  pct: string;
  run: number[];
}
export interface ChanceParams {
  variant: string;
  unit: string;
  bars: Bar[];
  checkpoints: number;
  games: number[];
  fact: string;
  scene: any;
  info: any;
}

const TOTAL = 600;
const K = 60;
function runTally(play: (g: number) => boolean[] | null, bars: { label: string; exact: Frac }[], unit: string) {
  const hits = bars.map(() => 0);
  const run: number[][] = bars.map(() => []);
  const games: number[] = [];
  let acc = 0;
  for (let g = 1; acc < TOTAL && g < 400000; g++) {
    const o = play(g);
    if (!o) continue;
    acc++;
    o.forEach((h, i) => (hits[i] += h ? 1 : 0));
    if (acc % (TOTAL / K) === 0) {
      hits.forEach((h, i) => run[i].push(Math.round((1000 * h) / acc) / 10));
      games.push(g);
    }
  }
  const out: Bar[] = bars.map((b, i) => ({ label: b.label, exact: ftext(b.exact), pct: pctText(b.exact), run: run[i] }));
  return { bars: out, games, unit };
}

function options3(r: ReturnType<typeof rng>, correct: string, decoys: string[]) {
  const options = r.shuffle([correct, ...decoys]);
  if (new Set(options).size !== 3) throw new Error('options not distinct');
  return { options, answerIndex: options.indexOf(correct) };
}

type R = ReturnType<typeof rng>;
type CP = Puzzle<ChanceParams>;

// ---------- variants ----------
function monty(seed: number, r: R, mode: 'know' | 'fall'): CP {
  const N = r.pick(mode === 'know' ? [3, 3, 4, 5, 6, 7, 8, 10, 20, 50, 100] : [3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 50, 100]);
  const ask = r.pick(['stay', 'switch']) as 'stay' | 'switch';
  const ex = montyExact(N, mode);
  const f = ask === 'stay' ? ex.stay : ex.swap;
  const correct = ftext(f);
  const { options, answerIndex } = options3(r, correct, [...new Set([ftext(mk(1, N)), '1/2', ftext(mk(N - 1, N))])].filter((x) => x !== correct).slice(0, 2));
  const sr = rng(seed * 31 + 7);
  const tally = runTally(
    (g) => {
      const q = gameRng(seed, g, 2477);
      const pick = q.int(0, N - 1);
      const car = q.int(0, N - 1);
      let rem = car;
      if (pick === car) {
        rem = q.int(0, N - 2);
        if (rem >= pick) rem++;
      } else if (mode === 'fall') {
        // host opens at random: the closed door is a random other door
        rem = q.int(0, N - 2);
        if (rem >= pick) rem++;
        if (car !== pick && car !== rem) return null;
      }
      return [pick === car, rem === car];
    },
    [{ label: 'Stay', exact: ex.stay }, { label: 'Switch', exact: ex.swap }],
    'games',
  );
  void sr;
  const opened = N - 2;
  const doorsText = opened === 1 ? '1 other door' : `${opened} other doors`;
  return {
    family: 'chance',
    seed,
    key: `chance:${mode === 'know' ? 'monty-hall' : 'monty-fall'}:${N}:${ask}`,
    label: mode === 'know' ? 'Monty Hall twist' : 'Clueless host',
    question:
      mode === 'know'
        ? `${N} doors, 1 car: your odds if you ${ask}? You pick door 1. The host, who knows where the car is, opens ${doorsText}, all goats, leaving one other door closed. Switching means taking that closed door.`
        : `The host does not know where the car is: odds if you ${ask}? ${N} doors hide 1 car and ${N - 1} goats. You pick door 1. The host opens ${doorsText} at random and by luck all show goats. Rounds showing the car are ignored.`,
    options,
    answerIndex,
    answer: correct,
    thinkSeconds: 8,
    stepCount: 3,
    params: {
      variant: mode === 'know' ? 'monty-hall' : 'monty-fall',
      unit: 'games',
      ...tally,
      checkpoints: K,
      fact: mode === 'fall' ? 'A lucky reveal makes it 50-50' : ask === 'stay' ? `Staying wins just ${ex.stay[0]} of ${ex.stay[1]}` : `Switching wins ${ex.swap[0]} of ${ex.swap[1]} games`,
      scene: { N },
      info: { N, ask, stay: ftext(ex.stay), swap: ftext(ex.swap), f: f.map(String), stayF: ex.stay.map(String), swapF: ex.swap.map(String) },
    },
  };
}

function twoChildren(seed: number, r: R): CP {
  const sex = r.pick(['G', 'B']);
  const cond = r.pick(['atleast', 'older', 'younger', 'day']);
  const target = r.pick(['both', 'mixed']);
  const day = r.int(0, 6);
  const T = cond === 'day' ? 14 : 2;
  const child = (t: number) => ({ s: t < T / 2 ? 'G' : 'B', d: T === 14 ? t % 7 : -1 });
  const cells: number[][] = [];
  let m = 0, t = 0;
  for (let a = 0; a < T; a++) {
    cells.push([]);
    for (let b = 0; b < T; b++) {
      const c1 = child(a), c2 = child(b);
      const hit = (c: { s: string; d: number }) => c.s === sex && (cond !== 'day' || c.d === day);
      const ok = cond === 'atleast' ? hit(c1) || hit(c2) : cond === 'older' ? hit(c1) : cond === 'younger' ? hit(c2) : hit(c1) || hit(c2);
      const tg = target === 'both' ? c1.s === sex && c2.s === sex : c1.s !== c2.s;
      cells[a].push(ok ? (tg ? 2 : 1) : 0);
      if (ok) {
        m++;
        if (tg) t++;
      }
    }
  }
  const f = mk(t, m);
  const correct = ftext(f);
  const pools: Record<string, string[]> = {
    'both:atleast': ['1/2', '1/4'], 'both:older': ['1/3', '1/4'], 'both:younger': ['1/3', '1/4'], 'both:day': ['1/3', '1/2'],
    'mixed:atleast': ['1/2', '1/3'], 'mixed:older': ['2/3', '1/3'], 'mixed:younger': ['2/3', '1/3'], 'mixed:day': ['1/2', '2/3'],
  };
  const { options, answerIndex } = options3(r, correct, pools[`${target}:${cond}`]);
  const S = sex === 'G' ? 'girl' : 'boy';
  const O = sex === 'G' ? 'boy' : 'girl';
  const dayName = DAYS[day];
  const condShort = cond === 'atleast' ? `at least one ${S}` : cond === 'older' ? `the older is a ${S}` : cond === 'younger' ? `the younger is a ${S}` : `one a ${S} born on ${dayName}`;
  const tgtShort = target === 'both' ? `both are ${S}s` : 'one of each';
  const tally = runTally(
    (g) => {
      const q = gameRng(seed, g, 5393);
      const a = q.int(0, T - 1), b = q.int(0, T - 1);
      const v = cells[a][b];
      return v === 0 ? null : [v === 2];
    },
    [{ label: cap(target === 'both' ? `both ${S}s` : 'one of each'), exact: f }],
    'families',
  );
  return {
    family: 'chance',
    seed,
    key: `chance:two-children:${sex}:${cond}${cond === 'day' ? day : ''}:${target}`,
    label: 'Two children',
    question: `Two kids, ${condShort}: odds ${target === 'both' ? '' : 'of '}${tgtShort}? Boys and girls are equally likely and independent${cond === 'day' ? ', as are the seven weekdays' : ''}.`,
    options,
    answerIndex,
    answer: correct,
    thinkSeconds: 8,
    stepCount: 3,
    params: {
      variant: 'two-children',
      unit: 'families',
      ...tally,
      checkpoints: K,
      fact: cond === 'day' ? `${t} of the ${m} fit cases` : `${t} of ${m} equally likely cases`,
      scene: { T, cells, m, t },
      info: { sex, S, O, cond, target, day: dayName, m, t, f: f.map(String), T },
    },
  };
}

const THRESH: [Frac, string][] = [[mk(1, 2), 'more likely than not'], [mk(9, 10), 'more than 90 percent likely'], [mk(99, 100), 'more than 99 percent likely']];
function birthday(seed: number, r: R): CP {
  const chanceMode = r.next() < 0.35;
  let D = 365, n: number, correct: string, decoys: string[];
  let tIdx = 0;
  let pf: Frac;
  if (chanceMode) {
    n = r.pick([10, 15, 20, 23, 25, 30, 35, 40, 45, 50, 55, 60, 70]);
    pf = birthdayShared(n, D);
    const pc = Math.round(tenths(pf) / 10);
    correct = `${pc}%`;
    const naive = Math.round((100 * n) / D);
    const cands = [naive, 25, 50, 75, 90, 10].filter((c) => Math.abs(c - pc) >= 8);
    const picked = [...new Set(cands)].slice(0, 2);
    decoys = picked.map((c) => `${c}%`);
  } else {
    D = r.pick([365, 365, 365, 100, 150, 200, 250, 300, 400, 500, 730, 1000]);
    tIdx = r.int(0, 2);
    n = birthdayThreshold(THRESH[tIdx][0], D);
    pf = birthdayShared(n, D);
    correct = String(n);
    const cands = [D / 2, D / 6, D / 3, D / 10, (2 * D) / 3, D / 20].map(Math.round);
    decoys = [...new Set(cands.filter((c) => Math.abs(c - n) / n > 0.3))].slice(0, 2).map(String);
  }
  const { options, answerIndex } = options3(r, correct, decoys);
  const prev = birthdayShared(n - 1, D);
  const tally = runTally((g) => [birthdayGame(seed, g, n, D).dup.length > 0], [{ label: 'Shared', exact: pf }], 'groups');
  const earth = D === 365 ? 'Every birthday is equally likely; ignore leap days.' : `Imagine a planet whose year has ${D} days, every birthday equally likely.`;
  return {
    family: 'chance',
    seed,
    key: chanceMode ? `chance:birthday:chance:${n}` : `chance:birthday:threshold:${D}:${tIdx}`,
    label: 'Birthday paradox',
    question: chanceMode
      ? `${n} people in a room: odds two share a birthday? ${earth}`
      : `How many people until a shared birthday is ${THRESH[tIdx][1].replace('percent', '%')}? ${earth}`,
    options,
    answerIndex,
    answer: correct,
    thinkSeconds: 8,
    stepCount: 3,
    params: {
      variant: 'birthday',
      unit: 'groups',
      ...tally,
      checkpoints: K,
      fact: `${n} people make ${(n * (n - 1)) / 2} pairs`,
      scene: { D, n },
      info: { chanceMode, n, D, tText: THRESH[tIdx][1], pn: (tenths(pf) / 10).toFixed(1), pprev: (tenths(prev) / 10).toFixed(1), pairs: (n * (n - 1)) / 2, pnSpoken: pctSpoken(pf, 1), pprevSpoken: pctSpoken(prev, 1) },
    },
  };
}

function coinRace(seed: number, r: R): CP {
  const pats: string[] = [];
  for (let i = 0; i < 8; i++) pats.push([4, 2, 1].map((b) => (i & b ? 'T' : 'H')).join(''));
  for (let tries = 0; tries < 200; tries++) {
    const A = r.pick(pats), B = r.pick(pats);
    if (A === B) continue;
    const pA = coinExact(A, B);
    const diff = Number(pA[0] * 1000n / pA[1]) - 500;
    if (Math.abs(diff) < 80) continue;
    const winner = diff > 0 ? 0 : 1;
    const fw = winner === 0 ? pA : fsub(mk(1, 1), pA);
    const pB = fsub(mk(1, 1), pA);
    const correct = [A, B][winner];
    const { options, answerIndex } = options3(r, correct, [[A, B][1 - winner], 'Equal']);
    const tally = runTally((g) => {
      const w = coinGame(seed, g, A, B).winner;
      return [w === 0, w === 1];
    }, [{ label: `${A} first`, exact: pA }, { label: `${B} first`, exact: pB }], 'games');
    return {
      family: 'chance',
      seed,
      key: `chance:coin-race:${A}:${B}`,
      label: 'Coin pattern race',
      question: `Which coin pattern appears first more often: ${A} or ${B}? A fair coin is flipped again and again until one pattern shows up.`,
      options,
      answerIndex,
      answer: correct,
      thinkSeconds: 8,
      stepCount: 3,
      params: {
        variant: 'coin-race',
        unit: 'games',
        ...tally,
        checkpoints: K,
        fact: `${correct} wins ${fw[0]} of ${fw[1]} games`,
        scene: { A, B },
        info: { A, B, winner: correct, loser: [A, B][1 - winner], fw: fw.map(String), fwSpoken: `${spoken(fw)}, ${pctSpoken(fw)}` },
      },
    };
  }
  throw new Error('no coin pair');
}

function diceDuel(seed: number, r: R): CP {
  const face = () => r.int(1, 9);
  for (let tries = 0; tries < 20000; tries++) {
    const a = Array.from({ length: 6 }, face).sort((x, y) => x - y);
    const b = Array.from({ length: 6 }, face).sort((x, y) => x - y);
    const s = diceStats(a, b);
    const dec = s.aw + s.bw;
    if (dec < 20 || s.aw === s.bw) continue;
    const aWins = s.aw > s.bw;
    const share = Math.max(s.aw, s.bw) / dec;
    if (share < 0.58) continue;
    const sa = a.reduce((x, y) => x + y, 0), sb = b.reduce((x, y) => x + y, 0);
    if (tries < 15000 && (aWins ? sa >= sb : sb >= sa)) continue; // want the die with the smaller total to win
    const correct = aWins ? 'Die A' : 'Die B';
    const { options, answerIndex } = options3(r, correct, [aWins ? 'Die B' : 'Die A', 'Equal']);
    const tally = runTally(
      (g) => {
        const { ia, ib } = diceRoll(seed, g);
        const x = a[ia], y = b[ib];
        return x === y ? null : [x > y, y > x];
      },
      [{ label: 'Die A', exact: mk(s.aw, dec) }, { label: 'Die B', exact: mk(s.bw, dec) }],
      'rolls',
    );
    return {
      family: 'chance',
      seed,
      key: `chance:dice-duel:${a.join('')}:${b.join('')}`,
      label: 'Which die wins?',
      question: `Roll both dice, higher number wins: which die wins more? Die A: ${a.join(', ')}. Die B: ${b.join(', ')}. Both are fair; ties are rerolled.`,
      options,
      answerIndex,
      answer: correct,
      thinkSeconds: 9,
      stepCount: 3,
      params: {
        variant: 'dice-duel',
        unit: 'rolls',
        ...tally,
        checkpoints: K,
        fact: `${correct.slice(-1)} wins ${Math.max(s.aw, s.bw)} of 36 pairings`,
        scene: { a, b },
        info: { a, b, aw: s.aw, bw: s.bw, ties: s.ties, sa, sb, win: correct.slice(-1), lose: aWins ? 'B' : 'A', wins: Math.max(s.aw, s.bw), loses: Math.min(s.aw, s.bw), winnerSmaller: aWins ? sa < sb : sb < sa, sumWin: aWins ? sa : sb, sumLose: aWins ? sb : sa },
      },
    };
  }
  throw new Error('no dice pair');
}

function generate(seed: number): CP {
  const r = rng(seed);
  const v = r.pick(['monty-hall', 'monty-fall', 'two-children', 'birthday', 'coin-race', 'dice-duel']);
  if (v === 'monty-hall') return monty(seed, r, 'know');
  if (v === 'monty-fall') return monty(seed, r, 'fall');
  if (v === 'two-children') return twoChildren(seed, r);
  if (v === 'birthday') return birthday(seed, r);
  if (v === 'coin-race') return coinRace(seed, r);
  return diceDuel(seed, r);
}

const patWords = (p: string) => [...p].map((c) => (c === 'H' ? 'heads' : 'tails')).join(', ');

function narrate(p: CP): Line[] {
  const { variant, info, unit } = p.params;
  const run = (what: string): Line => ({ id: 's0', kind: 'step', step: 0, text: `Lock in your answer. Now watch ${what}.` });
  const ans = (id: string, step: number, text: string): Line => ({ id, kind: 'step', step, text });
  const fin = (text: string): Line => ({ id: 'f1', kind: 'final', text: `${text} ${END}` });
  if (variant === 'monty-hall' || variant === 'monty-fall') {
    const N: number = info.N;
    const know = variant === 'monty-hall';
    const f = (key: string): Frac => mk(BigInt(info[key][0]), BigInt(info[key][1]));
    const asked = info.ask === 'stay' ? f('stayF') : f('swapF');
    const opened = N - 2;
    const h1 = know
      ? `There are ${words(N)} doors. Behind one is a car, behind the rest are goats. You pick door number one.`
      : `There are ${words(N)} doors, one car, the rest goats. You pick door number one. The host does not know where the car is.`;
    const h2 = know
      ? `The host, who knows where the car is, opens ${opened === 1 ? 'one other door' : `${words(opened)} other doors`}, all goats. What are your odds if you ${info.ask}?`
      : `He opens ${opened === 1 ? 'one other door' : `${words(opened)} other doors`} at random, and by luck all show goats. What are your odds if you ${info.ask}?`;
    return [
      { id: 'h1', kind: 'hook', text: h1 },
      { id: 'h2', kind: 'hook', text: h2 },
      run(`hundreds of simulated ${unit}`),
      ans('s1', 1, `The chance is ${spoken(asked)}, ${pctSpoken(asked)}.`),
      ans('s2', 2, know
        ? info.ask === 'stay'
          ? `Your first pick was right only one time in ${words(N)}, and the host opening goat doors cannot change that. The rest of the chance moves to the last closed door.`
          : `Your first pick is right only one time in ${words(N)}. The host never opens the car, so if you were wrong, the last closed door must hide it. That happens ${N - 1} times out of ${N}.`
        : `Rounds where the host shows the car are thrown away. In the rounds that are left, your pick and the last closed door are equally likely to hide the car.`),
      fin(know ? 'A host who knows where the car is gives you information, and a random host does not.' : 'What the host knows changes the odds.'),
    ];
  }
  if (variant === 'two-children') {
    const { S, O, cond, target, day, m, t, T } = info;
    const f = mk(BigInt(info.f[0]), BigInt(info.f[1]));
    const clue = cond === 'atleast' ? `At least one of them is a ${S}.` : cond === 'older' ? `The older child is a ${S}.` : cond === 'younger' ? `The younger child is a ${S}.` : `At least one of them is a ${S} born on a ${day}.`;
    const q = target === 'both' ? `What is the chance that both are ${S}s?` : 'What is the chance that they are one boy and one girl?';
    const why = cond === 'atleast'
      ? `List the equally likely families: ${S} ${S}, ${S} ${O}, ${O} ${S}, ${O} ${O}. Only three have a ${S}. ${target === 'both' ? `Just one of those three has two ${S}s.` : 'Two of those three have one of each.'}`
      : cond === 'day'
        ? `List every combination of sex and weekday for both children. Of ${T * T}, exactly ${m} fit the clue, and ${t} of those ${target === 'both' ? `have two ${S}s` : 'have one of each'}.`
        : `Once you know the ${cond} child, the other child is still a ${S} or a ${O} with equal chances, whatever the first one is.`;
    return [
      { id: 'h1', kind: 'hook', text: `A family has two children. ${clue}` },
      { id: 'h2', kind: 'hook', text: q },
      run('hundreds of families that fit'),
      ans('s1', 1, `The chance is ${spoken(f)}, ${pctSpoken(f)}.`),
      ans('s2', 2, why),
      fin(cond === 'atleast' ? 'Extra information about one child changes the odds for the other.' : cond === 'day' ? 'Even a weekday clue shifts the odds.' : 'Knowing which child you mean matters.'),
    ];
  }
  if (variant === 'birthday') {
    const { n, D, chanceMode, tText, pnSpoken, pprevSpoken, pairs } = info;
    const room = D === 365 ? 'Every birthday is equally likely.' : `Their year has ${D} days, every birthday equally likely.`;
    return [
      { id: 'h1', kind: 'hook', text: chanceMode ? `${words(n)} people are in a room. ${room}` : `People walk into a room one at a time. ${room}` },
      { id: 'h2', kind: 'hook', text: chanceMode ? 'What is the chance that two of them share a birthday?' : `How many people do you need before a shared birthday is ${tText}?` },
      run('hundreds of random groups'),
      ans('s1', 1, chanceMode ? `With ${n} people, the chance is ${pnSpoken}.` : `You need ${n} people. With ${n - 1}, the chance is ${pprevSpoken}. With ${n}, it is ${pnSpoken}.`),
      ans('s2', 2, `Do not think about one person matching you. Think about pairs. ${n} people make ${pairs} different pairs, and every pair is a chance to match.`),
      fin('Pairs grow much faster than people.'),
    ];
  }
  if (variant === 'coin-race') {
    const { A, B, winner, loser, fwSpoken } = info;
    return [
      { id: 'h1', kind: 'hook', text: `A fair coin is flipped again and again. Player one wins if ${patWords(A)} shows up first, in a row.` },
      { id: 'h2', kind: 'hook', text: `Player two wins if ${patWords(B)} shows up first. Which pattern wins more often?` },
      run('hundreds of games'),
      ans('s1', 1, `${winner} wins more often: ${fwSpoken} of the games.`),
      ans('s2', 2, `Both patterns are equally likely at any given spot, but the race is not fair. A failed attempt can leave ${winner} halfway built while ${loser} is back at the start.`),
      fin('In this game, whoever picks second can always find a pattern that wins more often.'),
    ];
  }
  const { a, b, win, lose, wins, loses, ties, winnerSmaller, sumWin, sumLose } = info;
  return [
    { id: 'h1', kind: 'hook', text: `Two fair dice with unusual faces. Die A has ${a.join(', ')}. Die B has ${b.join(', ')}.` },
    { id: 'h2', kind: 'hook', text: 'You roll both, and the higher number wins. Ties are rolled again. Which die wins more often?' },
    run('hundreds of rolls'),
    ans('s1', 1, `Die ${win} wins more often: ${wins} of the 36 possible pairings, against ${loses} for die ${lose}, with ${ties} ties.`),
    ans('s2', 2, winnerSmaller
      ? `Die ${win} has the smaller total, ${sumWin} against ${sumLose}, yet it wins more often. Winning means beating the other die roll by roll, not having the bigger total.`
      : `Winning means beating the other die roll by roll, and die ${win} does that in more of the pairings.`),
    fin('The bigger total does not decide who wins.'),
  ];
}

export const chance: Family<ChanceParams> = { id: 'chance', generate, narrate };
