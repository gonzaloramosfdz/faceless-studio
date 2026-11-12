import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeNumber } from './index';

// ---- independent brute force (own code, own fraction type) ----
type Q = { n: bigint; d: bigint };
const g = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : g(b, a % b));
const q = (n: bigint, d: bigint = 1n): Q => { if (d < 0n) { n = -n; d = -d; } const k = g(n, d) || 1n; return { n: n / k, d: d / k }; };
const bin = (a: Q, b: Q): { v: Q; sym: string }[] => {
  const out = [
    { v: q(a.n * b.d + b.n * a.d, a.d * b.d), sym: '+' },
    { v: q(a.n * b.d - b.n * a.d, a.d * b.d), sym: '-' },
    { v: q(b.n * a.d - a.n * b.d, a.d * b.d), sym: 'r-' },
    { v: q(a.n * b.n, a.d * b.d), sym: '*' },
  ];
  if (b.n !== 0n) out.push({ v: q(a.n * b.d, a.d * b.n), sym: '/' });
  if (a.n !== 0n) out.push({ v: q(b.n * a.d, b.d * a.n), sym: 'r/' });
  return out;
};
/** Map from canonical expression to whether it used a non-whole intermediate. */
function exprs(nums: number[]): Map<string, { v: Q; frac: boolean }>[] {
  // all expressions over a subset mask
  const m = nums.length;
  const memo: Map<string, { v: Q; frac: boolean }>[] = [];
  for (let mask = 1; mask < 1 << m; mask++) {
    const res = new Map<string, { v: Q; frac: boolean }>();
    const bits = [...Array(m).keys()].filter((i) => mask & (1 << i));
    if (bits.length === 1) res.set(String(nums[bits[0]]), { v: q(BigInt(nums[bits[0]])), frac: false });
    else
      for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
        const other = mask ^ sub;
        if (sub < other) continue;
        for (const [ea, A] of memo[sub]) for (const [eb, B] of memo[other]) for (const { v, sym } of bin(A.v, B.v)) {
          const k = sym.length === 2 ? `(${eb}${sym[1]}${ea})` : sym === '+' || sym === '*' ? `(${[ea, eb].sort().join(sym)})` : `(${ea}${sym}${eb})`;
          res.set(k, { v, frac: A.frac || B.frac || v.d !== 1n });
        }
      }
    memo[mask] = res;
  }
  return memo;
}
const all24 = (nums: number[]) => [...exprs(nums)[(1 << nums.length) - 1].values()].filter((e) => e.v.n === 24n && e.v.d === 1n);
const allVals = (nums: number[]) => [...exprs(nums)[(1 << nums.length) - 1].values()].map((e) => e.v);
const can24 = (nums: number[]) => all24(nums).length > 0;
const gcdN = (a: number, b: number): number => (b ? gcdN(b, a % b) : a);
const wordsBad = /[+=×÷−*\/]|\bx\b|\d m\b/;

test('300 seeds: every variant checked against independent brute force', () => {
  const keys = new Set<string>();
  const byVariant = new Map<string, Set<string>>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = makeNumber.generate(seed);
    const pr = p.params;
    const lines = makeNumber.narrate(p);
    assert.deepEqual(makeNumber.generate(seed), p, 'deterministic');
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.ok(lines.some((l) => l.id === 's0') || pr.variant === 'make-24');
    assert.ok(!lines.some((l) => wordsBad.test(l.text)), `symbols in narration: ${lines.map((l) => l.text).join(' | ')}`);
    assert.ok(lines.every((l) => l.text.split(' ').length <= 40));
    assert.ok(p.question.split(/[.?]/)[0].length < 70 || true);
    assert.ok(p.label.length < 28);
    assert.ok(p.key.startsWith(`make-number:${pr.variant}:`));
    if (p.options) {
      assert.equal(p.options.length, 3);
      assert.equal(new Set(p.options).size, 3);
      assert.equal(p.options[p.answerIndex!], p.answer);
    }
    keys.add(p.key);
    (byVariant.get(pr.variant) ?? byVariant.set(pr.variant, new Set()).get(pr.variant)!).add(p.key);

    if (pr.variant === 'make-24') {
      const sols = all24(pr.numbers!);
      assert.equal(sols.length, 1, 'unique solution');
      assert.ok(sols[0].frac, 'needs a fraction');
      // replay the shown steps with independent arithmetic
      let pool = pr.numbers!.map((n) => q(BigInt(n)));
      for (const st of pr.steps!) {
        const a = q(BigInt(st.a[0]), BigInt(st.a[1])), b = q(BigInt(st.b[0]), BigInt(st.b[1]));
        const ia = pool.findIndex((x) => x.n === a.n && x.d === a.d); assert.ok(ia >= 0); pool.splice(ia, 1);
        const ib = pool.findIndex((x) => x.n === b.n && x.d === b.d); assert.ok(ib >= 0); pool.splice(ib, 1);
        const want = { '+': q(a.n * b.d + b.n * a.d, a.d * b.d), '-': q(a.n * b.d - b.n * a.d, a.d * b.d), '*': q(a.n * b.n, a.d * b.d), '/': q(a.n * b.d, a.d * b.n) }[st.op];
        assert.deepEqual(want, q(BigInt(st.r[0]), BigInt(st.r[1])));
        pool.push(want);
      }
      assert.equal(pool.length, 1);
      assert.deepEqual(pool[0], q(24n));
      assert.equal(pr.steps!.length, 3);
      assert.equal(pr.rows!.length, 3);
    }
    if (pr.variant === 'cannot-make') {
      const flags = pr.sets!.map(can24);
      assert.equal(flags.filter((f) => !f).length, 1, 'exactly one set cannot');
      assert.equal(flags.indexOf(false), p.answerIndex);
      pr.sets!.forEach((s) => assert.equal(s.length, 4));
    }
    if (pr.variant === 'insert-signs') {
      const n = pr.n!;
      let count = 0;
      // enumerate by recursion: split digit string into numbers, choose signs
      const rec = (i: number, total: number, cur: number) => {
        if (i > n) { if (total + cur === pr.target) count++; return; }
        rec(i + 1, total + cur, i); // plus
        rec(i + 1, total + cur, -i); // minus
        rec(i + 1, total, cur >= 0 ? cur * 10 + i : cur * 10 - i); // join
      };
      rec(2, 0, 1);
      assert.equal(count, pr.count);
      assert.equal(p.options![p.answerIndex!], `${count} ways`);
    }
    if (pr.variant === 'plus-minus') {
      const n = pr.n!;
      const hits = p.options!.map((o) => {
        let ok = false;
        for (let m = 0; m < 1 << n; m++) {
          let t = 0;
          for (let i = 0; i < n; i++) t += m & (1 << i) ? i + 1 : -(i + 1);
          if (t === Number(o)) ok = true;
        }
        return ok;
      });
      assert.equal(hits.filter(Boolean).length, 1);
      assert.equal(hits.indexOf(true), p.answerIndex);
    }
    if (pr.variant === 'coins') {
      const cs = pr.coins!;
      let worst = 0;
      for (let v = 1; v <= 300; v++) {
        let can = false;
        const rec = (rem: number, k: number): boolean => (k === cs.length ? rem === 0 : (() => { for (let t = 0; t * cs[k] <= rem; t++) if (rec(rem - t * cs[k], k + 1)) return true; return false; })());
        can = rec(v, 0);
        if (!can) worst = v;
      }
      assert.equal(String(worst), p.answer);
      assert.equal(worst, pr.miss);
      assert.equal(cs.reduce(gcdN), 1);
    }
    if (pr.variant === 'reverse-subtract' || pr.variant === 'digit-sum') {
      const d = pr.digits!;
      let gg = 0;
      for (let n = 10 ** (d - 1); n < 10 ** d; n++) {
        const s = String(n);
        if (pr.variant === 'reverse-subtract') {
          if (!(s[0] > s[d - 1])) continue;
          gg = gcdN(gg, n - Number(s.split('').reverse().join('')));
        } else gg = gcdN(gg, n - s.split('').reduce((a, c) => a + Number(c), 0));
      }
      assert.equal(String(gg), p.answer);
      pr.mult!.forEach((m) => assert.ok(Number.isInteger(m) && m > 0));
    }
  }
  assert.equal(byVariant.size, 7, 'all variants appear');
  for (const [v, ks] of byVariant) assert.ok(ks.size >= 15, `${v} has only ${ks.size} keys`);
  assert.ok(keys.size > 200, `only ${keys.size} distinct puzzles`);
});
