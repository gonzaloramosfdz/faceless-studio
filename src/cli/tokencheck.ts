// Login check: confirms YouTube and Instagram logins work and renews the Instagram token (it lasts 60 days).
// The renewed token is saved back to the repo secret if the GH_ADMIN_TOKEN secret exists; otherwise an issue asks for a manual update.
import { execFileSync } from 'node:child_process';
import { openIssue } from '../publish/github';
import { refresh } from '../publish/meta';
import { check as ytCheck } from '../publish/youtube';

const problems: string[] = [];
try {
  await ytCheck();
  console.log('YouTube login works');
} catch (e) {
  problems.push(`YouTube: ${(e as Error).message}. Re-authorize and replace the YT_REFRESH_TOKEN secret (RUNBOOK.md, "Refresh tokens").`);
}
try {
  const r = await refresh();
  console.log(`Instagram login works for @${r.username}; renewed token is valid for ${r.days} days`);
  if (process.env.GH_ADMIN_TOKEN) {
    execFileSync('gh', ['secret', 'set', 'IG_ACCESS_TOKEN', '--repo', process.env.GITHUB_REPOSITORY!], {
      input: r.token,
      env: { ...process.env, GH_TOKEN: process.env.GH_ADMIN_TOKEN },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('Saved the renewed Instagram token to the IG_ACCESS_TOKEN secret');
  } else {
    problems.push('Instagram: the token works but could not be renewed automatically because the GH_ADMIN_TOKEN secret is not set. Generate a new token in the Meta app dashboard within 30 days and replace IG_ACCESS_TOKEN (RUNBOOK.md, "Refresh tokens").');
  }
} catch (e) {
  problems.push(`Instagram: ${(e as Error).message.replace(/access_token=[^&\s]+/g, 'access_token=[redacted]')}. Generate a new token in the Meta app dashboard and replace the IG_ACCESS_TOKEN secret (RUNBOOK.md, "Refresh tokens").`);
}
if (problems.length) {
  await openIssue('Login check: action needed', problems.map((p) => `- ${p}`).join('\n'), ['failure']);
  process.exit(1);
}
