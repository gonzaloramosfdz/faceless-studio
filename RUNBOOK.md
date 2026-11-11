# Runbook

How to operate the channel once it is running. Everything here works from a phone with the GitHub mobile app or a browser.

## How it runs

| Workflow | When (Monterrey time) | What it does |
|---|---|---|
| Post | 11:30 and 17:30 daily | Renders the next planned puzzle and publishes it |
| Weekly batch | Sunday 03:17 | Stats report issue, long-form video, plans the next 14 posts |
| Login check | 1st of the month | Tests the YouTube and Meta logins, warns before they expire |
| Publish approved | Only when you run it | Publishes a post waiting in the review queue |

Scheduled runs only happen while the repo variable `SCHEDULE_ENABLED` is `true`.

## Pause and resume

- **Pause everything:** repo → Settings → Secrets and variables → Actions → Variables → set `SCHEDULE_ENABLED` to `false`.
- **Resume:** set it back to `true`. Then run "Weekly batch" by hand once if the queue is empty.
- **Pause one workflow:** Actions → pick the workflow → "…" → Disable workflow.

## Run something by hand

Actions → pick the workflow → Run workflow.

- **Post, dry run on:** renders a video and uploads nothing. The video is in the run's Artifacts for 7 days.
- **Post, dry run off:** publishes the next due post now. Enter an `id` to post a specific one.
- **Weekly batch, dry run off:** plans the next 7 days immediately.

## Approve or reject a review post

Each waiting post has an issue titled "Review: …".

- **Approve:** Actions → Publish approved → Run workflow → enter the id from the issue (for example `2026-11-16-1`).
- **Reject:** close the issue. The private YouTube upload stays private; delete it in YouTube Studio if you want.
- After 5 approvals on a platform, that platform publishes automatically. The counters are in `data/review.json`; set a number back to 0 to return that platform to review.
- A held Instagram or Facebook video expires after 7 days. If it expired, run Post with the same id and dry run off to render it again.

## Reading failures

A failed run retries once, then opens an issue titled "Pipeline failure: …" with the failing step and the last lines of output.

| Message contains | Meaning | Fix |
|---|---|---|
| `missing secrets` | A secret is not set | Add it under Settings → Secrets and variables → Actions |
| `oauth2.googleapis.com … 400` or `invalid_grant` | YouTube login expired or revoked | "Refresh tokens" below |
| `graph.facebook.com … 190` or `OAuthException` | Meta token expired or revoked | "Refresh tokens" below |
| `quotaExceeded` or `uploadLimitExceeded` | YouTube daily limit hit | Wait a day; nothing else to do |
| `nothing due` with 0 items queued | The queue is empty | Run Weekly batch with dry run off |
| `puzzle changed since it was planned` | Puzzle code was edited after planning | Run Weekly batch again; delete the stale entry from `data/queue.json` |
| `Instagram processing failed` | Meta rejected the video file | Re-run once; if it repeats, open a maintenance session |
| Render or `npm ci` errors | Dependency or runner change | Open a maintenance session |

A failed post is safe to re-run: platforms that already succeeded are skipped.

## Refresh tokens

- **YouTube:** the refresh token lasts as long as the Google app is "In production" and is used at least once every 6 months. If it dies, repeat the YouTube authorization step in `SETUP.md` and replace the `YT_REFRESH_TOKEN` secret.
- **Meta:** a page token made from a long-lived user token should not expire, but Meta can revoke it (password change, removed permission). The monthly login check reports the expiry date. To renew, repeat the Meta token step in `SETUP.md` and replace `META_PAGE_TOKEN`.
- Never paste a token into an issue, a commit or a chat. Only into GitHub's secret form.

## Keeping ideas fresh

The planner never repeats an idea (`family:variant`) within 12 days, which needs at least 24 ideas. The weekly report states the current count and warns when the pool is too small. New variants need a Claude Code session: ask it to "add two new variants to <family> following the freefall reference, with simulation tests".

## Maintenance sessions

- Model: Sonnet 5.5 for routine fixes and new variants. Opus 5.5 only for a bug that survives two attempts.
- Start by saying "read CLAUDE.md"; it holds the file map and decisions so nothing is re-researched.
- Research in `research/` is reusable for 30 days from the date in each file.

## Public repo note

Scheduled workflows in a public repo stop after 60 days without repository activity. The pipeline commits data every day, which should count as activity. If runs ever stop without a failure issue, open Actions: GitHub shows a banner with a button to re-enable them.
