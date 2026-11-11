// Instagram Reels through the Instagram API with Instagram Login (graph.instagram.com). No Facebook Page needed.
// Instagram fetches the video from a public URL, so the file is attached to a temporary GitHub release and removed afterwards.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { http, need } from '../core/util';

const GRAPH = `https://graph.instagram.com${process.env.IG_API_VERSION ? '/' + process.env.IG_API_VERSION : ''}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const form = (o: Record<string, string>) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(o),
});

let userId: string | undefined;
async function igUser(token: string): Promise<string> {
  if (userId) return userId;
  const me: any = await (await http(`${GRAPH}/me?fields=user_id,username&access_token=${token}`)).json();
  userId = String(me.user_id ?? me.id);
  return userId;
}

/** Puts the file at a public URL for a few minutes. Returns the URL and a cleanup function. */
function hostTemporarily(file: string, name: string): { url: string; remove: () => void } {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo || !process.env.GH_TOKEN) throw new Error('Instagram upload needs to run inside GitHub Actions (it hosts the video on a temporary release)');
  const tag = `tmp-${name}-${Date.now()}`;
  execFileSync('gh', ['release', 'create', tag, file, '--repo', repo, '--prerelease', '--title', 'Temporary upload', '--notes', 'Deleted automatically within minutes.'], { stdio: 'pipe' });
  return {
    url: `https://github.com/${repo}/releases/download/${tag}/${path.basename(file)}`,
    remove: () => {
      try {
        execFileSync('gh', ['release', 'delete', tag, '--repo', repo, '--yes', '--cleanup-tag'], { stdio: 'pipe' });
      } catch (e) {
        console.log(`could not delete temporary release ${tag}: ${(e as Error).message}`);
      }
    },
  };
}

export async function instagramReel(file: string, caption: string, name: string): Promise<{ id: string; url: string }> {
  need('IG_ACCESS_TOKEN');
  const token = process.env.IG_ACCESS_TOKEN!;
  const ig = await igUser(token);
  const hosted = hostTemporarily(file, name);
  try {
    const created: any = await (await http(`${GRAPH}/${ig}/media`, form({ media_type: 'REELS', video_url: hosted.url, caption, share_to_feed: 'true', access_token: token }))).json();
    // Instagram downloads and processes the video before it can be published.
    for (let i = 0; i < 40; i++) {
      const s: any = await (await http(`${GRAPH}/${created.id}?fields=status_code,status&access_token=${token}`)).json();
      if (s.status_code === 'FINISHED') break;
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram processing failed: ${s.status ?? s.status_code}`);
      if (i === 39) throw new Error('Instagram processing timed out after 10 minutes');
      await sleep(15000);
    }
    const published: any = await (await http(`${GRAPH}/${ig}/media_publish`, form({ creation_id: created.id, access_token: token }))).json();
    let url = '';
    try {
      url = ((await (await http(`${GRAPH}/${published.id}?fields=permalink&access_token=${token}`)).json()) as any).permalink ?? '';
    } catch {}
    return { id: published.id, url };
  } finally {
    hosted.remove();
  }
}

export async function instagramStats(ids: string[]) {
  const token = process.env.IG_ACCESS_TOKEN!;
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

/**
 * Instagram tokens last 60 days. Refreshing gives a new token with a fresh 60 days.
 * Returns the new token so the caller can store it; throws if the current token no longer works.
 */
export async function refresh(): Promise<{ token: string; days: number; username: string }> {
  need('IG_ACCESS_TOKEN');
  const token = process.env.IG_ACCESS_TOKEN!;
  const me: any = await (await http(`${GRAPH}/me?fields=user_id,username&access_token=${token}`)).json();
  const r: any = await (await http(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`)).json();
  return { token: r.access_token, days: Math.round(Number(r.expires_in) / 86400), username: me.username };
}
