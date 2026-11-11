import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const DATA = path.join(ROOT, 'data');

export const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
export const flag = (name: string) => process.argv.includes(`--${name}`);

export function readJson<T>(file: string, fallback: T): T {
  const p = path.join(DATA, file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : fallback;
}
export function writeJson(file: string, value: unknown) {
  const p = path.join(DATA, file);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(value, null, 1) + '\n');
}

/** Calendar date (YYYY-MM-DD) in the channel's time zone. */
export const TZ = 'America/Monterrey';
export function localDate(d = new Date(), offsetDays = 0): string {
  const shifted = new Date(d.getTime() + offsetDays * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted);
}
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export const env = (name: string) => process.env[name] || '';
export function need(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`missing secrets: ${missing.join(', ')}`);
}

/** fetch that throws with the response body on a non-2xx status. Never logs request headers or bodies. */
export async function http(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = (await res.text()).slice(0, 600);
    throw new Error(`${init.method ?? 'GET'} ${new URL(url).origin}${new URL(url).pathname} -> ${res.status}: ${body}`);
  }
  return res;
}
