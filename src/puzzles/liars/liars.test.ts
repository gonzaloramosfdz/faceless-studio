import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liars } from './index';

const ones = (m: number) => m.toString(2).split('').filter((c) => c === '1').length;
const has = (m: number, i: number) => (m & (1 << i)) !== 0;

/** Independent brute force over all truth assignments (bit i set = person i truthful / knight). */
function brute(variant: string, stmts: any[]): number[] {
  const n = stmts.length;
  const found: number[] = [];
  for (let m = 0; m < 2 ** n; m++) {
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      const s = stmts[i];
      let v: boolean;
      const liarsNow = n - ones(m);
      if (s.k === 'knight') v = has(m, s.a);
      else if (s.k === 'knave') v = !has(m, s.a);
      else if (s.k === 'same') v = has(m, s.a) === has(m, s.b);
      else if (s.k === 'diff') v = has(m, s.a) !== has(m, s.b);
      else if (s.k === 'allknave') v = m === 0;
      else if (s.k === 'oneknave') v = ones(m) < n;
      else if (s.k === 'exone') v = ones(m) === 1;
      else if (s.k === 'exact') v = liarsNow === s.n;
      else if (s.k === 'atleast') v = liarsNow >= s.n;
      else if (s.k === 'atmost') v = liarsNow <= s.n;
      else if (s.k === 'allliars') v = m === 0;
      else if (s.k === 'prevliar') v = !has(m, i - 1);
      else if (s.k === 'prevtruth') v = has(m, i - 1);
      else throw new Error('unknown ' + s.k);
      if (v !== has(m, i)) ok = false;
    }
    if (ok) found.push(m);
  }
  return found;
}

test('300 seeds: answers match independent brute force', () => {
  const variants = new Set<string>();
  const perVariant: Record<string, Set<string>> = {};
  const keys = new Set<string>();
  for (let seed = 1; seed <= 300; seed++) {
    const p = liars.generate(seed);
    const q = p.params;
    variants.add(q.variant);
    (perVariant[q.variant] ??= new Set()).add(p.key);
    keys.add(p.key);
    assert.ok(p.key.startsWith(`liars:${q.variant}:`));
    const n = q.people.length;

    if (q.variant.startsWith('culprit')) {
      const target = q.variant === 'culprit-liar' ? n - 1 : 1;
      const hits: number[] = [];
      for (let c = 0; c < n; c++) {
        let t = 0;
        for (const s of q.stmts as any[]) {
          if (s.k === 'was' ? c === s.a : s.k === 'wasnt' ? c !== s.a : c === s.a || c === s.b) t++;
        }
        if (t === target) hits.push(c);
      }
      assert.equal(hits.length, 1, `culprit not unique seed ${seed}`);
      assert.equal(q.people[hits[0]], p.answer);
    } else {
      const sol = brute(q.variant, q.stmts);
      assert.equal(sol.length, 1, `not unique seed ${seed}`);
      const m = sol[0];
      if (q.variant === 'knights-knaves') {
        const right = p.options![p.answerIndex!];
        const ks = q.people.filter((_, i) => has(m, i));
        const expect = ks.length === 0 ? 'Nobody' : ks.length === n ? (n === 2 ? 'Both' : 'Everyone') : ks.length === 1 ? `Only ${ks[0]}` : ks.join(' and ');
        assert.equal(right, expect);
      } else {
        assert.equal(p.answer, `${ones(m)} truthful`);
      }
      q.people.forEach((_, i) => assert.equal(q.truthful[i], has(m, i)));
    }

    assert.equal(p.answer, p.options![p.answerIndex!]);
    assert.equal(p.options!.length, 3);
    assert.equal(new Set(p.options).size, 3);
    assert.ok(p.label.length < 28);
    assert.ok(p.question.split(/[.?]/)[0].length < 70, `title too long: ${p.question}`);
    const lines = liars.narrate(p);
    assert.equal(lines.filter((l) => l.step !== undefined).length, p.stepCount);
    assert.ok(lines.some((l) => l.id === 's0'));
    for (const l of lines) {
      assert.ok(!/[+=×÷]|\bx\b/.test(l.text), `symbol in narration: ${l.text}`);
      assert.ok(l.text.split(/\s+/).length <= 40, `line too long: ${l.text}`);
    }
    assert.deepEqual(liars.generate(seed), p);
  }
  assert.equal(variants.size, 6);
  for (const [v, ks] of Object.entries(perVariant)) assert.ok(ks.size >= 15, `${v}: only ${ks.size} keys`);
  assert.ok(keys.size > 100, `only ${keys.size} distinct keys`);
});
