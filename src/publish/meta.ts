// Instagram Reels and Facebook Reels through the Graph API (resumable upload, no public file URL needed).
import { readFileSync, statSync } from 'node:fs';
import { http, need } from '../core/util';

const V = process.env.META_API_VERSION || 'v25.0';
const GRAPH = `https://graph.facebook.com/${V}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pushBytes(url: string, file: string, token: string) {
  await http(url, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, offset: '0', file_size: String(statSync(file).size) },
    body: readFileSync(file),
  });
}

export async function instagramReel(file: string, caption: string): Promise<{ id: string; url: string }> {
  need('META_PAGE_TOKEN', 'IG_USER_ID');
  const token = process.env.META_PAGE_TOKEN!;
  const ig = process.env.IG_USER_ID!;
  const created: any = await (
    await http(`${GRAPH}/${ig}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true', access_token: token }),
    })
  ).json();
  await pushBytes(created.uri, file, token);
  // Meta processes the video before it can be published.
  for (let i = 0; i < 40; i++) {
    const s: any = await (await http(`${GRAPH}/${created.id}?fields=status_code,status&access_token=${token}`)).json();
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram processing failed: ${s.status ?? s.status_code}`);
    if (i === 39) throw new Error('Instagram processing timed out after 10 minutes');
    await sleep(15000);
  }
  const published: any = await (
    await http(`${GRAPH}/${ig}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: created.id, access_token: token }),
    })
  ).json();
  let url = '';
  try {
    const m: any = await (await http(`${GRAPH}/${published.id}?fields=permalink&access_token=${token}`)).json();
    url = m.permalink ?? '';
  } catch {}
  return { id: published.id, url };
}

export async function facebookReel(file: string, description: string): Promise<{ id: string; url: string }> {
  need('META_PAGE_TOKEN', 'FB_PAGE_ID');
  const token = process.env.META_PAGE_TOKEN!;
  const page = process.env.FB_PAGE_ID!;
  const form = (o: Record<string, string>) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...o, access_token: token }),
  });
  const started: any = await (await http(`${GRAPH}/${page}/video_reels`, form({ upload_phase: 'start' }))).json();
  await pushBytes(started.upload_url, file, token);
  await http(`${GRAPH}/${page}/video_reels`, form({ upload_phase: 'finish', video_id: started.video_id, video_state: 'PUBLISHED', description }));
  return { id: started.video_id, url: `https://www.facebook.com/reel/${started.video_id}` };
}

export async function instagramStats(ids: string[]) {
  const token = process.env.META_PAGE_TOKEN!;
  const out: Record<string, { views: number; likes: number; comments: number }> = {};
  for (const id of ids) {
    try {
      const m: any = await (await http(`${GRAPH}/${id}?fields=like_count,comments_count&access_token=${token}`)).json();
      let views = 0;
      try {
        const ins: any = await (await http(`${GRAPH}/${id}/insights?metric=views&access_token=${token}`)).json();
        views = Number(ins.data?.[0]?.values?.[0]?.value ?? 0);
      } catch {}
      out[id] = { views, likes: Number(m.like_count ?? 0), comments: Number(m.comments_count ?? 0) };
    } catch {}
  }
  return out;
}

export async function facebookStats(ids: string[]) {
  const token = process.env.META_PAGE_TOKEN!;
  const out: Record<string, { views: number; likes: number; comments: number }> = {};
  for (const id of ids) {
    try {
      const ins: any = await (await http(`${GRAPH}/${id}/video_insights?metric=blue_reels_play_count&access_token=${token}`)).json();
      out[id] = { views: Number(ins.data?.[0]?.values?.[0]?.value ?? 0), likes: 0, comments: 0 };
    } catch {}
  }
  return out;
}

/** Reports whether the token works and when it expires (0 means it does not expire). */
export async function check(): Promise<{ expiresAt: number }> {
  need('META_PAGE_TOKEN', 'META_APP_ID', 'META_APP_SECRET');
  const token = process.env.META_PAGE_TOKEN!;
  const app = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
  const d: any = await (await http(`${GRAPH}/debug_token?input_token=${token}&access_token=${app}`)).json();
  if (!d.data?.is_valid) throw new Error('Meta token is no longer valid');
  return { expiresAt: Number(d.data.expires_at ?? 0) };
}
