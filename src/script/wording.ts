// Asks a free LLM (GitHub Models) to reword narration and write titles, in ONE call for the whole week.
// Every reply is validated; anything that fails falls back to the template, so a bad or missing LLM never blocks a post.
import type { Line, Puzzle } from '../core/types';

export interface Wording {
  lines: Line[];
  title: string;
  description: string;
  tags: string[];
  source: 'llm' | 'template';
}

export const DISCLOSURE = 'Voice and script assistance are AI-generated. The physics is computed and checked by code.';
const BASE_TAGS = ['physics', 'puzzle', 'science', 'brainteaser'];
const numbers = (s: string) => (s.match(/\d+(\.\d+)?/g) ?? []).sort().join(',');
const trim = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

export function templateWording(p: Puzzle, lines: Line[]): Wording {
  // Label plus the first sentence of the setup, so template titles differ from one puzzle to the next.
  const setup = p.question.split(/(?<=[.?!])\s/)[0].replace(/\.$/, '');
  return {
    lines,
    title: trim(`${p.label.replace(/[?:]$/, '')}? ${setup}`, 90),
    description: `${p.question}\n\nPause, pick your answer, then watch what really happens.\nA new physics puzzle twice a day.\n\n${DISCLOSURE}`,
    tags: [...BASE_TAGS, p.family.replace(/-/g, '')],
    source: 'template',
  };
}

/** Accepts the LLM's version of one item only if it kept the structure and every number. */
export function validate(p: Puzzle, template: Line[], got: any): Wording | null {
  if (!got || !Array.isArray(got.lines) || got.lines.length !== template.length) return null;
  const lines: Line[] = [];
  for (let i = 0; i < template.length; i++) {
    const text = got.lines[i];
    const t = template[i];
    if (typeof text !== 'string') return null;
    if (numbers(text) !== numbers(t.text)) return null; // no number added, dropped or changed
    if (text.length < t.text.length * 0.5 || text.length > t.text.length * 1.6) return null;
    if (/[×÷=<>]|\bkm\/h\b|\bm\/s\b|https?:/.test(text)) return null; // must stay speakable
    lines.push({ ...t, text: text.trim() });
  }
  if (!lines[lines.length - 1].text.includes('Follow')) return null;
  const base = templateWording(p, lines);
  const title = typeof got.title === 'string' && got.title.length >= 15 && got.title.length <= 90 && !/\d+\s?%|most people|99|only \d/i.test(got.title) ? got.title.trim() : base.title;
  const tags = Array.isArray(got.tags) ? got.tags.filter((t: any) => typeof t === 'string' && /^[a-z0-9]{3,24}$/.test(t)).slice(0, 4) : [];
  return { ...base, title, tags: [...new Set([...BASE_TAGS, ...tags])], source: 'llm' };
}

const SYSTEM = `You polish narration for short physics-puzzle videos aimed at curious adults. For each item you get the question, the correct answer and the template narration lines. Rewrite each line so it sounds natural, clear and a little playful when read aloud by a text-to-speech voice.
Rules:
- Keep the same number of lines, in the same order, each doing the same job as the original.
- Keep every number exactly as written. Do not add numbers, statistics, names, dates or claims that are not in the original.
- Do not change the physics or the answer. Do not reveal the answer before the line that originally reveals it.
- Spell out units and symbols in words. No emoji, no hashtags, no links.
- The last line must still end by asking the viewer to follow.
- Also write a title (under 80 characters, a question or a plain statement, no clickbait statistics such as "99% fail") and up to 4 lowercase one-word tags.
Reply with JSON only: {"items":[{"id":"...","lines":["..."],"title":"...","tags":["..."]}]}`;

export async function wordBatch(items: { id: string; puzzle: Puzzle; lines: Line[] }[]): Promise<Record<string, Wording>> {
  const out: Record<string, Wording> = {};
  for (const it of items) out[it.id] = templateWording(it.puzzle, it.lines);
  const token = process.env.GITHUB_TOKEN;
  if (!token || process.env.LLM_DISABLED === '1') {
    console.log('[wording] no token or LLM disabled: using template narration');
    return out;
  }
  try {
    const model = process.env.LLM_MODEL || 'openai/gpt-4o-mini';
    const body = (m: string) =>
      JSON.stringify({
        model: m,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(items.map((it) => ({ id: it.id, question: it.puzzle.question, answer: it.puzzle.answer, lines: it.lines.map((l) => l.text) }))) },
        ],
      });
    const endpoints: [string, string][] = process.env.LLM_ENDPOINT
      ? [[process.env.LLM_ENDPOINT, model]]
      : [['https://models.github.ai/inference/chat/completions', model]];
    let data: any;
    const failures: string[] = [];
    for (const [url, m] of endpoints) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(45000),
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
          body: body(m),
        });
      } catch (e) {
        const cause = (e as any).cause;
        failures.push(`${new URL(url).host}: network error ${cause?.code ?? ''} ${cause?.message ?? (e as Error).message}`);
        continue;
      }
      const raw = await res.text();
      try {
        const j = JSON.parse(raw);
        if (res.ok && j.choices) {
          data = j;
          break;
        }
        failures.push(`${new URL(url).host}: status ${res.status}: ${raw.slice(0, 200)}`);
      } catch {
        failures.push(`${new URL(url).host}: status ${res.status}, ${res.headers.get('content-type')}, location ${res.headers.get('location')}: ${raw.slice(0, 120)}`);
      }
    }
    if (!data) throw new Error(failures.join(' || '));
    const parsed = JSON.parse(data.choices[0].message.content);
    let ok = 0;
    for (const it of items) {
      const got = (parsed.items ?? []).find((x: any) => x.id === it.id);
      const w = validate(it.puzzle, it.lines, got);
      if (w) {
        out[it.id] = w;
        ok++;
      }
    }
    console.log(`[wording] LLM wording accepted for ${ok}/${items.length} items; the rest use the template`);
  } catch (e) {
    console.log(`[wording] LLM call failed, using template narration: ${(e as Error).message}`);
  }
  return out;
}
