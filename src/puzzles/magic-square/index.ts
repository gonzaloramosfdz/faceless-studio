import { rng } from '../../core/rng';
import type { Family, Line, Puzzle } from '../../core/types';

export type LineRef = { type: 'row' | 'col' | 'diag'; index: number };
export interface MagicStep {
  line: LineRef;
  cell: [number, number];
  value: number;
  known: [number, number];
}
export interface MagicParams {
  grid: number[][];
  given: boolean[][];
  sum: number;
  /** The complete line that tells the viewer the magic sum. */
  sumLine: LineRef;
  steps: MagicStep[];
}

const LO_SHU = [
  [2, 7, 6],
  [9, 5, 1],
  [4, 3, 8],
];

export const cellsOf = (l: LineRef): [number, number][] =>
  l.type === 'row'
    ? [0, 1, 2].map((c) => [l.index, c] as [number, number])
    : l.type === 'col'
      ? [0, 1, 2].map((r) => [r, l.index] as [number, number])
      : [0, 1, 2].map((i) => [i, l.index === 0 ? i : 2 - i] as [number, number]);

const ALL_LINES: LineRef[] = [
  ...[0, 1, 2].map((index) => ({ type: 'row' as const, index })),
  ...[0, 1, 2].map((index) => ({ type: 'col' as const, index })),
  { type: 'diag', index: 0 },
  { type: 'diag', index: 1 },
];

/** Fills gaps one at a time from lines that have exactly one gap. Returns null if it gets stuck. */
export function solve(grid: number[][], given: boolean[][], sum: number): MagicStep[] | null {
  const known = given.map((r) => [...r]);
  const steps: MagicStep[] = [];
  const gaps = () => known.flat().filter((k) => !k).length;
  while (gaps() > 0) {
    const line = ALL_LINES.find((l) => cellsOf(l).filter(([r, c]) => !known[r][c]).length === 1);
    if (!line) return null;
    const cells = cellsOf(line);
    const cell = cells.find(([r, c]) => !known[r][c])!;
    const others = cells.filter((x) => x !== cell).map(([r, c]) => grid[r][c]) as [number, number];
    const value = sum - others[0] - others[1];
    if (value !== grid[cell[0]][cell[1]]) throw new Error('solver disagrees with grid');
    known[cell[0]][cell[1]] = true;
    steps.push({ line, cell, value, known: others });
  }
  return steps;
}

function generate(seed: number): Puzzle<MagicParams> {
  const r = rng(seed);
  for (let attempt = 0; attempt < 200; attempt++) {
    // Any rotation or mirror of the Lo Shu square, scaled and shifted, is still magic.
    let g = LO_SHU.map((row) => [...row]);
    for (let i = r.int(0, 3); i > 0; i--) g = g[0].map((_, c) => g.map((row) => row[c]).reverse());
    if (r.next() < 0.5) g = g.map((row) => [...row].reverse());
    const mul = r.pick([1, 1, 2, 3]);
    const add = r.int(0, 12);
    g = g.map((row) => row.map((v) => v * mul + add));
    const sum = g[0][0] + g[0][1] + g[0][2];

    const sumLine = r.pick(ALL_LINES);
    const keep = new Set(cellsOf(sumLine).map(([a, b]) => a * 3 + b));
    const rest = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !keep.has(i)));
    const hidden = new Set(rest.slice(0, r.int(4, 5)));
    const given = g.map((row, a) => row.map((_, b) => !hidden.has(a * 3 + b)));
    const steps = solve(g, given, sum);
    if (!steps) continue;
    const flat = g.flat().map((v, i) => (hidden.has(i) ? '_' : v)).join(',');
    return {
      family: 'magic-square',
      seed,
      key: `magic-square:${flat}`,
      label: 'Magic square',
      question: 'Every row, column and diagonal adds up to the same number. Fill the gaps.',
      answer: g.map((row) => row.join(' ')).join(' / '),
      params: { grid: g, given, sum, sumLine, steps },
      stepCount: steps.length,
    };
  }
  throw new Error(`magic-square: no solvable instance for seed ${seed}`);
}

const lineName = (l: LineRef) =>
  l.type === 'row'
    ? ['Top row', 'Middle row', 'Bottom row'][l.index]
    : l.type === 'col'
      ? ['Left column', 'Middle column', 'Right column'][l.index]
      : 'The diagonal';

function narrate(p: Puzzle<MagicParams>): Line[] {
  const { grid, sum, sumLine, steps } = p.params;
  const [a, b, c] = cellsOf(sumLine).map(([r, col]) => grid[r][col]);
  const lines: Line[] = [
    { id: 'h1', kind: 'hook', text: 'In this square, every row, column and diagonal adds up to the same number.' },
    { id: 'h2', kind: 'hook', text: 'Can you fill the gaps before the timer runs out?' },
    {
      id: 's0',
      kind: 'step',
      text: `Start with the line that is already full. ${a} plus ${b} plus ${c} makes ${sum}, so every line must total ${sum}.`,
    },
  ];
  steps.forEach((s, i) => {
    const lead = i === 0 ? '' : i === steps.length - 1 ? 'Last one. ' : '';
    lines.push({
      id: `s${i + 1}`,
      kind: 'step',
      step: i,
      text: `${lead}${lineName(s.line)}: ${sum} minus ${s.known[0]} minus ${s.known[1]} leaves ${s.value}.`,
    });
  });
  lines.push({ id: 'f1', kind: 'final', text: 'Every line now adds up. Follow for a new puzzle every day.' });
  return lines;
}

export const magicSquare: Family<MagicParams> = { id: 'magic-square', generate, narrate };
