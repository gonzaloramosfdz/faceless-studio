// Monthly check that the platform logins still work. Opens an issue before a token dies, not after.
import { openIssue } from '../publish/github';
import { check as metaCheck } from '../publish/meta';
import { check as ytCheck } from '../publish/youtube';

const problems: string[] = [];
try {
  await ytCheck();
  console.log('YouTube login works');
} catch (e) {
  problems.push(`YouTube: ${(e as Error).message}. Re-authorize and replace the YT_REFRESH_TOKEN secret (RUNBOOK.md, "Refresh tokens").`);
}
try {
  const { expiresAt } = await metaCheck();
  const days = expiresAt ? Math.round((expiresAt * 1000 - Date.now()) / 86400000) : Infinity;
  console.log(`Meta login works${expiresAt ? `, expires in ${days} days` : ', does not expire'}`);
  if (days < 40) problems.push(`Meta: the page token expires in ${days} days. Create a new one and replace the META_PAGE_TOKEN secret (RUNBOOK.md, "Refresh tokens").`);
} catch (e) {
  problems.push(`Meta: ${(e as Error).message}. Create a new page token and replace the META_PAGE_TOKEN secret (RUNBOOK.md, "Refresh tokens").`);
}
if (problems.length) {
  await openIssue('Login check: action needed', problems.map((p) => `- ${p}`).join('\n'), ['failure']);
  process.exit(1);
}
