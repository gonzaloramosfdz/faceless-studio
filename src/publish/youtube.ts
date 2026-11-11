// YouTube Data API v3 through plain HTTPS. Secrets come from the environment and are never logged.
import { readFileSync, statSync } from 'node:fs';
import { http, need } from '../core/util';

let cached: { token: string; until: number } | undefined;

export async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  need('YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN');
  const res = await http('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID!,
      client_secret: process.env.YT_CLIENT_SECRET!,
      refresh_token: process.env.YT_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  const data: any = await res.json();
  cached = { token: data.access_token, until: Date.now() + (data.expires_in - 60) * 1000 };
  return cached.token;
}

export interface YtUpload {
  file: string;
  title: string;
  description: string;
  tags: string[];
  privacy: 'private' | 'public';
}

export async function upload(u: YtUpload): Promise<{ id: string; url: string }> {
  const token = await accessToken();
  const size = statSync(u.file).size;
  const start = await http('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(size),
    },
    body: JSON.stringify({
      snippet: { title: u.title, description: u.description, tags: u.tags, categoryId: '27', defaultLanguage: 'en' },
      status: { privacyStatus: u.privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true },
    }),
  });
  const location = start.headers.get('location');
  if (!location) throw new Error('YouTube did not return an upload URL');
  const done = await http(location, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
    body: readFileSync(u.file),
  });
  const video: any = await done.json();
  return { id: video.id, url: `https://youtu.be/${video.id}` };
}

/** Review approval: flips a private upload to public. */
export async function makePublic(id: string) {
  const token = await accessToken();
  await http('https://www.googleapis.com/youtube/v3/videos?part=status', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }),
  });
}

export async function stats(ids: string[]): Promise<Record<string, { views: number; likes: number; comments: number }>> {
  const out: Record<string, { views: number; likes: number; comments: number }> = {};
  if (!ids.length) return out;
  const token = await accessToken();
  for (let i = 0; i < ids.length; i += 50) {
    const res = await http(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.slice(i, i + 50).join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data: any = await res.json();
    for (const v of data.items ?? [])
      out[v.id] = { views: Number(v.statistics.viewCount ?? 0), likes: Number(v.statistics.likeCount ?? 0), comments: Number(v.statistics.commentCount ?? 0) };
  }
  return out;
}

/** Fails loudly if the refresh token has expired or been revoked. Used by the monthly token check. */
export async function check() {
  cached = undefined;
  await accessToken();
}
