// GitHub issues for the review queue, failures and weekly reports. Uses the workflow's built-in token.
import { http } from '../core/util';

const repo = () => process.env.GITHUB_REPOSITORY || '';
const headers = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
});
export const inActions = () => Boolean(process.env.GITHUB_TOKEN && repo());
export const runUrl = () => `https://github.com/${repo()}/actions/runs/${process.env.GITHUB_RUN_ID}`;

export async function openIssue(title: string, body: string, labels: string[] = []): Promise<number | undefined> {
  if (!inActions()) {
    console.log(`[issue, not sent outside GitHub Actions] ${title}\n${body}`);
    return undefined;
  }
  const post = (withLabels: boolean) =>
    http(`https://api.github.com/repos/${repo()}/issues`, { method: 'POST', headers: headers(), body: JSON.stringify(withLabels ? { title, body, labels } : { title, body }) });
  // Labels are a convenience; if the repo rejects them the issue is still opened.
  const res = await post(true).catch(() => post(false));
  return ((await res.json()) as any).number;
}

export async function closeIssue(number: number, comment: string) {
  if (!inActions()) return;
  await http(`https://api.github.com/repos/${repo()}/issues/${number}/comments`, { method: 'POST', headers: headers(), body: JSON.stringify({ body: comment }) });
  await http(`https://api.github.com/repos/${repo()}/issues/${number}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ state: 'closed' }) });
}
