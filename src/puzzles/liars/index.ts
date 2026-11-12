import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export type Variant = 'knights-knaves' | 'culprit-liar' | 'culprit-truth' | 'counting-liars' | 'liar-ladder' | 'liar-chain';

export type Stmt =
  | { k: 'knight' | 'knave'; a: number }
  | { k: 'same' | 'diff'; a: number; b: number }
  | { k: 'allknave' | 'oneknave' | 'exone' }
  | { k: 'was' | 'wasnt'; a: number }
  | { k: 'either'; a: number; b: number }
  | { k: 'exact' | 'atleast' | 'atmost'; n: number }
  | { k: 'allliars' | 'prevliar' | 'prevtruth' };

export interface LiarsParams {
  variant: Variant;
  people: string[];
  stmts: Stmt[];
  /** Statement as shown in the bubble. */
  said: string[];
  /** Statement as spoken. */
  spoken: string[];
  /** truthful[i]: person i tells the truth in the unique solution. */
  truthful: boolean[];
  culprit?: number;
  /** Culprit variants: number of true statements if suspect i were guilty. */
  hyp?: number[];
  cases: number;
  fact: string;
  badgeTrue: string;
  badgeFalse: string;
  /** Culprit variants: how many true statements the culprit's case has. */
  target?: number;
}

const NAMES = ['Ann', 'Ben', 'Cara', 'Dan', 'Eve', 'Finn', 'Gus', 'Hal', 'Ivy', 'Jon', 'Kit', 'Leo'];
const WORD: Record<number, string> = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight' };
const bit = (m: number, i: number) => ((m >> i) & 1) === 1;
const pop = (m: number) => {
  let c = 0;
  for (; m; m >>= 1) c += m & 1;
  return c;
};
const lc = (s: string) => s[0].toLowerCase() + s.slice(1);
type R = ReturnType<typeof rng>;

// ---------- evaluation (the solver) ----------
function evalKnight(s: Stmt, m: number, n: number): boolean {
  switch (s.k) {
    case 'knight': return bit(m, s.a);
    case 'knave': return !bit(m, s.a);
    case 'same': return bit(m, s.a) === bit(m, s.b);
    case 'diff': return bit(m, s.a) !== bit(m, s.b);
    case 'allknave': return pop(m) === 0;
    case 'oneknave': return pop(m) < n;
    case 'exone': return pop(m) === 1;
    default: throw new Error('bad stmt');
  }
}
export function solveKnights(stmts: Stmt[]): number[] {
  const n = stmts.length;
  const out: number[] = [];
  for (let m = 0; m < 1 << n; m++) if (stmts.every((s, i) => evalKnight(s, m, n) === bit(m, i))) out.push(m);
  return out;
}
function evalCulprit(s: Stmt, c: number): boolean {
  if (s.k === 'was') return c === s.a;
  if (s.k === 'wasnt') return c !== s.a;
  if (s.k === 'either') return c === s.a || c === s.b;
  throw new Error('bad stmt');
}
export const trueCounts = (stmts: Stmt[]) => stmts.map((_, c) => stmts.filter((s) => evalCulprit(s, c)).length);
function evalCount(s: Stmt, liars: number): boolean {
  if (s.k === 'exact') return liars === s.n;
  if (s.k === 'atleast') return liars >= s.n;
  if (s.k === 'atmost') return liars <= s.n;
  throw new Error('bad stmt');
}
export function solveCounting(stmts: Stmt[]): number[] {
  const n = stmts.length;
  const out: number[] = [];
  for (let m = 0; m < 1 << n; m++) if (stmts.every((s, i) => evalCount(s, n - pop(m)) === bit(m, i))) out.push(m);
  return out;
}
export function solveChain(stmts: Stmt[]): number[] {
  const n = stmts.length;
  const out: number[] = [];
  for (let m = 0; m < 1 << n; m++) {
    const ok = stmts.every((s, i) => {
      const t = s.k === 'allliars' ? m === 0 : s.k === 'prevliar' ? !bit(m, i - 1) : bit(m, i - 1);
      return t === bit(m, i);
    });
    if (ok) out.push(m);
  }
  return out;
}

// ---------- text ----------
function kText(s: Stmt, i: number, names: string[]): string {
  const n = names.length;
  switch (s.k) {
    case 'knight': return s.a === i ? 'I am a knight' : `${names[s.a]} is a knight`;
    case 'knave': return s.a === i ? 'I am a knave' : `${names[s.a]} is a knave`;
    case 'same':
    case 'diff': {
      const tail = s.k === 'same' ? 'the same type' : 'different types';
      const verb = 'are';
      if (s.a === i || s.b === i) return `${names[s.a === i ? s.b : s.a]} and I ${verb} ${tail}`;
      return `${names[s.a]} and ${names[s.b]} ${verb} ${tail}`;
    }
    case 'allknave': return n === 2 ? 'We are both knaves' : 'We are all knaves';
    case 'oneknave': return 'At least one of us is a knave';
    case 'exone': return 'Exactly one of us is a knight';
    default: throw new Error('bad stmt');
  }
}
function cText(s: Stmt, i: number, names: string[]): string {
  const nm = (j: number) => (j === i ? 'me' : names[j]);
  if (s.k === 'was') return `It was ${nm(s.a)}`;
  if (s.k === 'wasnt') return `It wasn't ${nm(s.a)}`;
  if (s.k === 'either') return `It was ${nm(s.a)} or ${nm(s.b)}`;
  throw new Error('bad stmt');
}
function nText(s: Stmt): string {
  if (s.k !== 'exact' && s.k !== 'atleast' && s.k !== 'atmost') throw new Error('bad stmt');
  const lead = s.k === 'exact' ? 'Exactly' : s.k === 'atleast' ? 'At least' : 'At most';
  return `${lead} ${s.n} of us ${s.n === 1 ? 'is a liar' : 'are liars'}`;
}
const nShort = (s: Stmt) =>
  s.k === 'exact' ? `exactly ${(s as any).n}` : s.k === 'atleast' ? `at least ${(s as any).n}` : `at most ${(s as any).n}`;

function hookLines(intro: string, spoken: string[], ask: string): Line[] {
  const h = Math.ceil(spoken.length / 2);
  return [
    { id: 'h1', kind: 'hook', text: [intro, ...spoken.slice(0, h)].join(' ') },
    { id: 'h2', kind: 'hook', text: [...spoken.slice(h), ask].join(' ') },
  ];
}

function mkOptions(answer: string, pool: string[], r: R) {
  const others = r.shuffle(pool.filter((x) => x !== answer)).slice(0, 2);
  const options = r.shuffle([answer, ...others]);
  return { options, answerIndex: options.indexOf(answer) };
}

const setText = (m: number, names: string[]) => {
  const ks = names.filter((_, i) => bit(m, i));
  if (ks.length === 0) return 'Nobody';
  if (ks.length === names.length) return names.length === 2 ? 'Both' : 'Everyone';
  if (ks.length === 1) return `Only ${ks[0]}`;
  return ks.join(' and ');
};

// ---------- generators ----------
function knightsKnaves(seed: number, r: R): Puzzle<LiarsParams> {
  const n = r.pick([2, 3, 3]);
  const people = r.shuffle(NAMES).slice(0, n);
  let stmts: Stmt[] = [];
  let sol: number[] = [];
  for (let tries = 0; tries < 5000; tries++) {
    stmts = people.map((_, i) => {
      const x = r.next();
      const pair = () => {
        const a = r.int(0, n - 1);
        let b = r.int(0, n - 2);
        if (b >= a) b++;
        return [a, b];
      };
      if (x < 0.3) return { k: 'knight', a: r.int(0, n - 1) } as Stmt;
      if (x < 0.55) return { k: 'knave', a: r.int(0, n - 1) } as Stmt;
      if (x < 0.75) { const [a, b] = pair(); return { k: 'same', a, b } as Stmt; }
      if (x < 0.9) { const [a, b] = pair(); return { k: 'diff', a, b } as Stmt; }
      return { k: r.pick(['allknave', 'oneknave', 'exone']) } as Stmt;
    });
    sol = solveKnights(stmts);
    if (sol.length === 1) break;
  }
  if (sol.length !== 1) throw new Error('no knights instance');
  const m = sol[0];
  const all = Array.from({ length: 1 << n }, (_, x) => x);
  const answer = setText(m, people);
  const { options, answerIndex } = mkOptions(answer, all.map((x) => setText(x, people)), r);
  const code = stmts.map((s) => ('a' in s ? (s.k === 'knight' ? 'k' : s.k === 'knave' ? 'n' : s.k === 'same' ? 's' : 'd') + s.a + ('b' in s ? s.b : '') : s.k[0]));
  return {
    family: 'liars',
    seed,
    key: `liars:knights-knaves:${n}:${code.join('.')}`,
    label: 'Knights and knaves',
    question: `Who are the knights among these ${n === 2 ? 'two' : 'three'} islanders? Knights always tell the truth, knaves always lie. Each islander makes one statement.`,
    options,
    answerIndex,
    answer,
    thinkSeconds: n === 2 ? 8 : 10,
    stepCount: 3,
    params: {
      variant: 'knights-knaves',
      people,
      stmts,
      said: stmts.map((s, i) => kText(s, i, people)),
      spoken: stmts.map((s, i) => `${people[i]} says, ${kText(s, i, people)}.`),
      truthful: people.map((_, i) => bit(m, i)),
      cases: 1 << n,
      fact: `Only 1 of ${1 << n} cases fits every statement`,
      badgeTrue: 'Knight',
      badgeFalse: 'Knave',
    },
  };
}

function culprit(seed: number, r: R, mode: 'liar' | 'truth'): Puzzle<LiarsParams> {
  const n = r.pick([4, 5]);
  const people = r.shuffle(NAMES).slice(0, n);
  const target = mode === 'liar' ? n - 1 : 1;
  let stmts: Stmt[] = [];
  let c = -1;
  for (let tries = 0; tries < 20000; tries++) {
    stmts = people.map(() => {
      const x = r.next();
      const a = r.int(0, n - 1);
      if (x < 0.4) return { k: 'was', a } as Stmt;
      if (x < 0.75) return { k: 'wasnt', a } as Stmt;
      let b = r.int(0, n - 2);
      if (b >= a) b++;
      return { k: 'either', a, b } as Stmt;
    });
    const hits = trueCounts(stmts).map((t, i) => (t === target ? i : -1)).filter((i) => i >= 0);
    if (hits.length === 1) { c = hits[0]; break; }
  }
  if (c < 0) throw new Error('no culprit instance');
  const hyp = trueCounts(stmts);
  const answer = people[c];
  const { options, answerIndex } = mkOptions(answer, people, r);
  const code = stmts.map((s) => s.k[0] + (s as any).a + ((s as any).b ?? ''));
  const rule = mode === 'liar' ? 'exactly one of them lies' : 'exactly one of them tells the truth';
  return {
    family: 'liars',
    seed,
    key: `liars:culprit-${mode === 'liar' ? 'liar' : 'truth'}:${n}:${code.join('.')}:${people.join('')}`,
    label: mode === 'liar' ? 'Exactly one liar' : 'Exactly one truth',
    question: `${WORD[n]} suspects, ${rule}. Who did it? Exactly one suspect is guilty, and each makes one statement.`,
    options,
    answerIndex,
    answer,
    thinkSeconds: 10,
    stepCount: 3,
    params: {
      variant: mode === 'liar' ? 'culprit-liar' : 'culprit-truth',
      people,
      stmts,
      said: stmts.map((s, i) => cText(s, i, people)),
      spoken: stmts.map((s, i) => `${people[i]} says, ${lc(cText(s, i, people))}.`),
      truthful: people.map((_, i) => evalCulprit(stmts[i], c)),
      culprit: c,
      hyp,
      target,
      cases: n,
      fact: `Only ${answer} gives exactly ${target} true ${target === 1 ? 'statement' : 'statements'}`,
      badgeTrue: 'Truth',
      badgeFalse: 'Liar',
    },
  };
}

function countingBase(
  seed: number,
  variant: 'counting-liars' | 'liar-ladder',
  people: string[],
  stmts: Stmt[],
  keyTail: string,
  label: string,
): Puzzle<LiarsParams> {
  const n = people.length;
  const sol = solveCounting(stmts);
  if (sol.length !== 1) throw new Error('not unique');
  const m = sol[0];
  const T = pop(m);
  const answer = `${T} truthful`;
  const rr = rng(seed + 7);
  const { options, answerIndex } = mkOptions(answer, Array.from({ length: n + 1 }, (_, x) => `${x} truthful`), rr);
  return {
    family: 'liars',
    seed,
    key: `liars:${variant}:${n}:${keyTail}`,
    label,
    question: `How many of these ${WORD[n].toLowerCase()} people tell the truth? Each one says how many of the group are liars. Liars always lie; the rest always tell the truth.`,
    options,
    answerIndex,
    answer,
    thinkSeconds: 10,
    stepCount: 3,
    params: {
      variant,
      people,
      stmts,
      said: stmts.map(nText),
      spoken: stmts.map((s, i) => `${people[i]} says ${nShort(s)}.`),
      truthful: people.map((_, i) => bit(m, i)),
      cases: 1 << n,
      fact: `With ${n - T} liars, exactly ${T} statements are true`,
      badgeTrue: 'Truth',
      badgeFalse: 'Liar',
    },
  };
}

function countingLiars(seed: number, r: R): Puzzle<LiarsParams> {
  const n = r.int(4, 7);
  const people = r.shuffle(NAMES).slice(0, n);
  for (let tries = 0; tries < 5000; tries++) {
    const T0 = r.int(1, n - 1);
    const L0 = n - T0;
    const who = r.shuffle(people.map((_, i) => i < T0));
    const stmts: Stmt[] = who.map((truth) => {
      for (;;) {
        const s = { k: r.pick(['exact', 'atleast', 'atmost']), n: r.int(1, n) } as Stmt;
        if (evalCount(s, L0) === truth) return s;
      }
    });
    if (solveCounting(stmts).length === 1) {
      const kinds = new Set(stmts.map((s) => s.k));
      if (kinds.size < 2) continue;
      return countingBase(seed, 'counting-liars', people, stmts, stmts.map((s) => s.k[0] + (s as any).n).join('.'), 'How many liars?');
    }
  }
  throw new Error('no counting instance');
}

function liarLadder(seed: number, r: R): Puzzle<LiarsParams> {
  const atLeast = r.next() < 0.5;
  const n = atLeast ? r.pick([4, 6, 8]) : r.int(4, 8);
  const people = r.shuffle(NAMES).slice(0, n);
  const ks = r.shuffle(people.map((_, i) => i + 1));
  const stmts: Stmt[] = ks.map((k) => ({ k: atLeast ? 'atleast' : 'exact', n: k }) as Stmt);
  return countingBase(seed, 'liar-ladder', people, stmts, `${atLeast ? 'least' : 'exact'}:${ks.join('')}`, 'The liar ladder');
}

function liarChain(seed: number, r: R): Puzzle<LiarsParams> {
  const n = r.int(4, 7);
  const people = r.shuffle(NAMES).slice(0, n);
  const stmts: Stmt[] = people.map((_, i) => (i === 0 ? { k: 'allliars' } : { k: r.next() < 0.5 ? 'prevliar' : 'prevtruth' }) as Stmt);
  const sol = solveChain(stmts);
  if (sol.length !== 1) throw new Error('chain not unique');
  const m = sol[0];
  const T = pop(m);
  const said = stmts.map((s, i) => (s.k === 'allliars' ? 'We are all liars' : s.k === 'prevliar' ? `${people[i - 1]} is a liar` : `${people[i - 1]} tells the truth`));
  const answer = `${T} truthful`;
  const { options, answerIndex } = mkOptions(answer, Array.from({ length: n + 1 }, (_, x) => `${x} truthful`), r);
  return {
    family: 'liars',
    seed,
    key: `liars:liar-chain:${n}:${stmts.map((s) => s.k[4] ?? 'a').join('')}`,
    label: 'Chain of liars',
    question: `${WORD[n]} people stand in a line. How many tell the truth? The first says everyone is a liar; each other person describes the one before. Liars always lie.`,
    options,
    answerIndex,
    answer,
    thinkSeconds: 9,
    stepCount: 3,
    params: {
      variant: 'liar-chain',
      people,
      stmts,
      said,
      spoken: said.map((t, i) => `${people[i]} says, ${lc(t)}.`),
      truthful: people.map((_, i) => bit(m, i)),
      cases: 1 << n,
      fact: 'The first person must be lying',
      badgeTrue: 'Truth',
      badgeFalse: 'Liar',
    },
  };
}

function generate(seed: number): Puzzle<LiarsParams> {
  const r = rng(seed);
  const v = r.pick<Variant>(['knights-knaves', 'culprit-liar', 'culprit-truth', 'counting-liars', 'liar-ladder', 'liar-chain']);
  switch (v) {
    case 'knights-knaves': return knightsKnaves(seed, r);
    case 'culprit-liar': return culprit(seed, r, 'liar');
    case 'culprit-truth': return culprit(seed, r, 'truth');
    case 'counting-liars': return countingLiars(seed, r);
    case 'liar-ladder': return liarLadder(seed, r);
    default: return liarChain(seed, r);
  }
}

// ---------- narration ----------
function narrate(p: Puzzle<LiarsParams>): Line[] {
  const q = p.params;
  const n = q.people.length;
  const end = 'Follow for a new puzzle every day.';
  const run: Line = { id: 's0', kind: 'step', step: 0, text: 'Lock in your answer. Now let us check.' };
  const mk = (a: string, why: string, fin: string): Line[] => [
    run,
    { id: 's1', kind: 'step', step: 1, text: a },
    { id: 's2', kind: 'step', step: 2, text: why },
    { id: 'f1', kind: 'final', text: `${fin} ${end}` },
  ];
  const T = q.truthful.filter(Boolean).length;
  const L = n - T;
  switch (q.variant) {
    case 'knights-knaves': {
      const names = q.people.filter((_, i) => q.truthful[i]);
      const a = names.length === 0 ? 'Nobody is a knight. They are all knaves.' : names.length === n ? 'Everyone is a knight.' : `The knights are ${names.join(' and ')}.`;
      return [
        ...hookLines(`Knights always tell the truth. Knaves always lie. ${WORD[n]} islanders speak.`, q.spoken, 'Who are the knights?'),
        ...mk(a, `Test every combination of knights and knaves. In each of the other ${q.cases - 1}, somebody says something that does not fit what they are. Only this one is consistent.`, 'When statements interlock, try every case and let the contradictions eliminate all but one.'),
      ];
    }
    case 'culprit-liar':
    case 'culprit-truth': {
      const liar = q.variant === 'culprit-liar';
      const name = q.people[q.culprit!];
      return [
        ...hookLines(`${WORD[n]} suspects, and exactly one did it. Exactly one of them ${liar ? 'is lying' : 'tells the truth'}.`, q.spoken, 'Who did it?'),
        ...mk(`It was ${name}.`, `Imagine each suspect guilty and count the true statements. Only ${name} gives exactly ${q.target} true ${q.target === 1 ? 'statement' : 'statements'}, so only ${name} fits.`, 'Assume a suspect, count the true statements, and only one assumption survives.'),
      ];
    }
    case 'counting-liars':
      return [
        ...hookLines(`${WORD[n]} people each claim how many liars there are among them.`, q.spoken, 'How many tell the truth?'),
        ...mk(`${T} of them tell the truth.`, `Try every possible number of liars. Only with ${L} liars are exactly ${T} statements true, which agrees with itself.`, 'Check every head count of liars, and only one count is self-consistent.'),
      ];
    case 'liar-ladder': {
      const atLeast = q.stmts[0].k === 'atleast';
      const why = atLeast
        ? 'A statement saying at least some number is true for every number up to the count of liars. So truth tellers equal liars, and the group splits evenly.'
        : `The statements give different numbers, so at most one can be right. If nobody were right, all ${n} would be liars, and the person who said ${n} would be right. So exactly one tells the truth.`;
      return [
        ...hookLines(`${WORD[n]} people each claim how many liars there are among them.`, q.spoken, 'How many tell the truth?'),
        ...mk((T === 1 ? 'Exactly 1 of them tells the truth.' : `${T} of them tell the truth.`), why, 'Look for the statements that cannot all be true at once.'),
      ];
    }
    default:
      return [
        ...hookLines(`${WORD[n]} people stand in a line. The first says we are all liars. Each other person describes the one before.`, q.spoken.slice(1), 'How many tell the truth?'),
        ...mk(`${T} of them tell the truth.`, 'The first person cannot be truthful, because then we are all liars would make that person a liar. So the first is lying, and each next statement settles the next person in turn.', 'Rule out the impossible first, and the rest of the chain falls into place.'),
      ];
  }
}

export const liars: Family<LiarsParams> = { id: 'liars', generate, narrate };
