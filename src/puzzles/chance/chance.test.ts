import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chance } from './index';

const val = (s: string) => {
  const [n, d] = s.split('/').map((x) => BigInt(x));
  return { n, d };
};
const sameFrac = (a: string, b: { n: bigint; d: bigint }) => {
  const x = val(a);
  return x.n * b.d === b.n * x.d;
};
const frac = (n: bigint, d: bigint) => ({ n, d });

/** Monty: sum the weight of every (car, pick, closed door) case, host choosing uniformly among his legal options. */
function monty(N: number, mode: string) {
  const L = BigInt(N - 1);
  let stay = 0n, swap = 0n, tot = 0n;
  for (let car = 0; car < N; car++)
    for (let pick = 0; pick < N; pick++) {
      const others = Array.from({ length: N }, (_, i) => i).filter((i) => i !== pick);
      // each "other" door is a candidate for staying closed
      const legal = mode === 'monty-hall' ? others.filter((d) => (pick === car ? true : d === car)) : others.filter((d) => car === pick || d === car);
      for (const d of legal) {
        const w = mode === 'monty-hall' ? L / BigInt(legal.length) : 1n;
        tot += w;
        if (car === pick) stay += w;
        if (car === d) swap += w;
      }
    }
  return { stay: frac(stay, tot), swap: frac(swap, tot) };
}

test('300 seeds: answers agree with independent brute force', () => {
  const variants = new Set<string>();
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = chance.generate(seed);
    const { variant, info, bars } = p.params;
    assert.deepEqual(chance.generate(seed), p);
    assert.equal(p.options!.length, 3);
    assert.equal(new Set(p.options).size, 3);
    assert.equal(p.options![p.answerIndex!], p.answer);
    assert.ok(p.key.startsWith('chance:'));
    assert.ok(p.key.split(':').length >= 3);
    assert.ok(p.question.split(/[.?!]/)[0].length < 70, `title too long: ${p.question}`);
    assert.ok(p.label.length < 28);
    let ok = false;
    if (variant === 'monty-hall' || variant === 'monty-fall') {
      const e = monty(info.N, variant);
      assert.ok(sameFrac(info.stay, e.stay) && sameFrac(info.swap, e.swap));
      assert.ok(sameFrac(p.answer, info.ask === 'stay' ? e.stay : e.swap));
      ok = true;
    } else if (variant === 'two-children') {
      const kids: { s: string; d: number }[] = [];
      for (const s of ['G', 'B']) for (let d = 0; d < (info.cond === 'day' ? 7 : 1); d++) kids.push({ s, d });
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      let m = 0n, t = 0n;
      for (const o of kids) for (const y of kids) {
        const isTarget = (c: { s: string; d: number }) => c.s === info.sex && (info.cond !== 'day' || days[c.d] === info.day);
        const fits = info.cond === 'older' ? isTarget(o) : info.cond === 'younger' ? isTarget(y) : isTarget(o) || isTarget(y);
        if (!fits) continue;
        m++;
        if (info.target === 'both' ? o.s === info.sex && y.s === info.sex : o.s !== y.s) t++;
      }
      assert.ok(sameFrac(p.answer, frac(t, m)), `${p.key} ${p.answer} vs ${t}/${m}`);
      ok = true;
    } else if (variant === 'birthday') {
      const D = BigInt(info.D);
      const shared = (n: number) => {
        let num = 1n, den = 1n;
        for (let i = 0; i < n; i++) { num *= D - BigInt(i); den *= D; }
        return frac(den - num, den);
      };
      if (info.chanceMode) {
        const f = shared(info.n);
        assert.equal(p.answer, `${Math.round(Number((f.n * 10000n) / f.d) / 100)}%`, p.key);
      } else {
        const th: Record<string, [bigint, bigint]> = { 'more likely than not': [1n, 2n], 'more than 90 percent likely': [9n, 10n], 'more than 99 percent likely': [99n, 100n] };
        const [a, b] = th[info.tText];
        let n = 1;
        for (;;) { n++; const f = shared(n); if (f.n * b > a * f.d) break; }
        assert.equal(String(n), p.answer);
      }
      assert.ok(sameFrac(bars[0].exact, shared(info.n)));
      ok = true;
    } else if (variant === 'coin-race') {
      // Float iteration of the chain: independent of the exact solver.
      const { A, B } = info;
      let dist: Record<string, number> = { '': 1 };
      let a = 0, b = 0;
      for (let step = 0; step < 400; step++) {
        const nd: Record<string, number> = {};
        for (const [s, pr] of Object.entries(dist)) for (const c of 'HT') {
          const t = s + c;
          if (t.endsWith(A)) a += pr / 2;
          else if (t.endsWith(B)) b += pr / 2;
          else nd[t.slice(-2)] = (nd[t.slice(-2)] ?? 0) + pr / 2;
        }
        dist = nd;
      }
      const ex = val(bars[0].exact);
      assert.ok(Math.abs(Number(ex.n) / Number(ex.d) - a) < 1e-9);
      assert.ok(Math.abs(a + b - 1) < 1e-9);
      assert.equal(p.answer, a > b ? A : B);
      assert.ok(Math.abs(a - b) > 0.1);
      ok = true;
    } else if (variant === 'dice-duel') {
      let x = 0, y = 0;
      for (const u of info.a) for (const v of info.b) { if (u > v) x++; if (v > u) y++; }
      assert.notEqual(x, y);
      assert.equal(p.answer, x > y ? 'Die A' : 'Die B');
      assert.ok(Math.max(x, y) / (x + y) >= 0.58);
      ok = true;
    }
    assert.ok(ok, variant);
    // the seeded tally ends near the exact value
    for (const b of bars) {
      const e = val(b.exact);
      const target = (100 * Number(e.n)) / Number(e.d);
      assert.ok(Math.abs(b.run[b.run.length - 1] - target) < 9, `${p.key} tally ${b.run[b.run.length - 1]} vs ${target}`);
      assert.equal(b.run.length, p.params.checkpoints);
    }
    const lines = chance.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.equal(lines[2].id, 's0');
    for (const l of lines) {
      assert.ok(!/[+=%/×]|\bx\b/.test(l.text), `symbol in narration: ${l.text}`);
      assert.ok(l.text.split(' ').length <= 38, `long line: ${l.text}`);
    }
    variants.add(variant);
    keys.add(p.key);
  }
  assert.equal(variants.size, 6);
  assert.ok(keys.size > 120, `only ${keys.size} distinct puzzles`);
});
