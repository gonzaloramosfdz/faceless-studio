import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magicSquare, cellsOf } from './index';

test('200 seeds: grid is magic, solver fills every gap, keys vary', () => {
  const keys = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) {
    const p = magicSquare.generate(seed);
    const { grid, given, sum, steps, sumLine } = p.params;
    const lines = [
      ...[0, 1, 2].map((i) => ({ type: 'row' as const, index: i })),
      ...[0, 1, 2].map((i) => ({ type: 'col' as const, index: i })),
      { type: 'diag' as const, index: 0 },
      { type: 'diag' as const, index: 1 },
    ];
    for (const l of lines) assert.equal(cellsOf(l).reduce((s, [r, c]) => s + grid[r][c], 0), sum);
    assert.ok(cellsOf(sumLine).every(([r, c]) => given[r][c]), 'sum line must be fully given');
    assert.equal(steps.length, given.flat().filter((g) => !g).length);
    assert.equal(new Set(grid.flat()).size, 9);
    assert.deepEqual(magicSquare.generate(seed).params, p.params, 'same seed, same puzzle');
    assert.equal(magicSquare.narrate(p).filter((l) => l.step !== undefined).length, steps.length);
    keys.add(p.key);
  }
  assert.ok(keys.size > 150, `only ${keys.size} distinct puzzles in 200 seeds`);
});
