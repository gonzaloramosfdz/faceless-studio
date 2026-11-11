# PLAN

Written 2026-11-11. Status: waiting for approval. Nothing below is built yet.

## Decisions so far

| Item | Decision |
|---|---|
| Niche | Math and logic puzzles |
| Language | English, one set of accounts |
| Platforms | YouTube (Shorts + weekly long-form), Instagram Reels, Facebook Reels. TikTok dropped. |
| Volume | 2 Shorts/Reels a day, 1 long-form 16:9 video a week |
| Budget | $0. No paid tools, no payment method anywhere. |
| Repo | Public, GitHub Actions standard runners |
| Review | First 5 posts per platform approved through GitHub issues, then fully automatic |
| Reporting | Weekly GitHub issue with viewership stats. No veto step. |

## Core design: code makes the puzzle, the LLM only words it

Each puzzle family is a small program with three parts: a **generator** (builds a random instance from a seed), a **solver** (computes the answer and the solution steps) and a **scene** (animates it). The LLM never produces a number or an answer. It only writes the hook, the narration around the solver's steps, the title and the description. If the LLM is down, a template narration is used and the run continues.

This gives correct answers with no human check, and every video is a different problem with its own solution.

**Puzzle families.** Six at launch, so no family appears more than three times a week:
1. Magic squares with gaps
2. "How many triangles/squares?" counting
3. River crossing and water-jug puzzles (state search)
4. Number sequences (next term, with the rule shown)
5. Balance-scale weighing puzzles
6. Probability traps with a simulated tally

Next in line, added in later maintenance sessions: clock and modular arithmetic, matchstick equations, cryptarithms, grid path counting. Reaching ten families is the main protection against YouTube's repetitive-content policy.

**Dedup.** Every published instance is stored as a hash of family + parameters in `data/published.json`. A new instance is rejected if its hash exists or if its narration is too similar to any of the last 60.

## Stack

| Part | Choice | License / cost | Fallback |
|---|---|---|---|
| Language | Node.js + TypeScript | free | none |
| Visuals | Remotion (React, renders through headless Chrome) | Free for individuals ([license](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)) | Manim Community (MIT) if a 45 s video takes more than 6 min to render on the runner |
| Math typesetting | KaTeX | MIT [unverified, confirm at build] | plain text |
| Voice | Kokoro-82M, a stock voice, run on CPU | Apache 2.0 weights; depends on espeak-ng (GPLv3) ([model card](https://huggingface.co/hexgrad/Kokoro-82M)) | Piper [license unverified] |
| Captions | Timed from the script: each sentence is synthesized separately and its audio length sets the caption timing. No speech recognition needed. | free | none |
| SFX | Generated with FFmpeg (ticks, chimes) | no license needed | none |
| Music | 3 to 5 CC0 tracks, chosen and license-checked at build, logged in `licenses.md` | free | no music |
| Assembly and export | FFmpeg | LGPL/GPL, used as a tool | none |
| LLM in the pipeline | GitHub Models through the workflow's built-in token (`models: read`), no secret needed ([GitHub blog](https://github.blog/ai-and-ml/llms/solving-the-inference-problem-for-open-source-ai-projects-with-github-models/)) | free tier; per-model limits not yet verified, read from the catalog endpoint at build | Gemini API free tier [unverified], then template narration |

Paid alternative, not proposed: Claude Haiku 5.5 for the weekly call would cost well under $0.05 a week, but needs a payment method.

## Folder structure

```
faceless-studio/
  CLAUDE.md  PLAN.md  TOOLS.md  RUNBOOK.md  licenses.md
  .claude/agents/          8 subagent definitions
  .github/workflows/       weekly-batch, post, publish-approved, token-check
  src/
    puzzles/<family>/      generator.ts, solver.ts, Scene.tsx, tests
    trend/ script/ voice/ visuals/ edit/ package/ publish/ analytics/
  data/
    queue/                 14 planned videos per week (JSON)
    published.json         hashes, platform IDs, dates
    analytics/             weekly summaries (Markdown + JSON)
  assets/                  fonts, music, with licenses
  research/                cached research, dated
  output/                  gitignored, local test renders only
```

Rendered videos never enter the repo.

## Data flow

1. **Weekly batch** picks 14 family + seed pairs (weighted by last week's analytics), runs generator and solver, asks the LLM for narration and metadata in one call, runs dedup, and commits `data/queue/<week>.json`.
2. **Post job** takes the next queue item, synthesizes the voice, renders 9:16, mixes audio, builds thumbnail and per-platform metadata, uploads, records the IDs in `published.json`, deletes temporary files.
3. **Sunday long-form:** the weekly batch job also renders a 16:9 compilation of the week's 7 best puzzles with longer explanations and uploads it to YouTube. The 16:9 layout is a separate composition, not a crop.
4. **Weekly report:** the same Sunday job pulls stats and opens one issue with views, watch time and retention per video and per family.

## Workflows and schedule

| Workflow | When (America/Monterrey, UTC-6, no DST) | Cron (UTC) |
|---|---|---|
| `post.yml` slot 1 | 11:30 start, live about 11:45 | `30 17 * * *` |
| `post.yml` slot 2 | 17:30 start, live about 17:45 | `30 23 * * *` |
| `weekly-batch.yml` | Sunday 03:17 | `17 9 * * 0` |
| `token-check.yml` | 1st of each month | `41 10 1 * *` |
| `publish-approved.yml` | manual trigger only | none |

All workflows also have a manual trigger with a `dry_run` option (renders, skips uploads).

**Posting times: the evidence is weak.** Published studies disagree with each other. Reports of Buffer's 2026 YouTube study point to around 4 p.m. for Shorts ([Hopper HQ](https://www.hopperhq.com/blog/best-time-to-post-youtube-shorts/), secondhand). Buffer's Instagram study of 9.6 million posts lists Wednesday 12 p.m. and 6 p.m. among its top slots, with evenings strongest on most days ([Buffer, July 2026](https://buffer.com/resources/when-is-the-best-time-to-post-on-instagram)). Later reports early morning instead ([Later](https://later.com/blog/best-time-to-post-on-instagram)). Midday and late afternoon are the slots most sources share, so the plan starts there. With English content the audience will be mostly in US time zones, and Monterrey matches US Central in winter. After four weeks the weekly report compares the two slots, and the times get adjusted from the channel's own data.

GitHub can start scheduled runs late under load, which is why the jobs start off the hour.

**Failure handling.** Each step retries once. A second failure opens a GitHub issue with the step name and the error, and the job stops. Secrets are masked in logs.

## Review queue (first 5 posts per platform)

- **YouTube:** uploaded as private. The issue links to it. Approval sets it public.
- **Instagram and Facebook:** no draft mode was found in their APIs. The video is kept as an Actions artifact for 7 days and linked in the issue.
- You approve by running `publish-approved.yml` from the GitHub mobile app with the issue number. A counter in `data/` switches each platform to automatic after 5 approvals.

## Runner and quota budget

| Limit | Value | Plan usage |
|---|---|---|
| Runner minutes, public repo | Free and unlimited on standard runners ([GitHub docs](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)) | About 61 post runs + 4 batch runs a month |
| Runner size, public repo | 4 CPU, 16 GB RAM, 14 GB SSD | Target 15 min or less per post job |
| Job time limit | 6 hours | far below |
| YouTube uploads | 100 a day ([videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)) | 2 a day, 3 on Sunday |
| Instagram | 50 API posts per 24 h ([Meta docs](https://developers.facebook.com/docs/instagram-platform/content-publishing/)) | 2 a day |
| Facebook Reels | 30 API posts per 24 h ([Meta docs](https://developers.facebook.com/documentation/video-api/guides/reels-publishing)) | 2 a day |

Everything fits. Cache and artifact storage limits are still [unverified] and will be read from the docs before the workflows are written.

## Open risks to resolve during the build

1. **Meta app access.** Whether posting to your own Instagram account and Facebook Page works without Meta app review is [unverified]. If review or business verification is required, I stop and explain the options before going further.
2. **Instagram upload method.** The API may need the video at a public URL instead of a direct upload [unverified]. Fallback: attach the file to a temporary GitHub release, publish, then delete the release.
3. **Google OAuth.** Refresh tokens expire after 7 days while the app is in "Testing" ([Google docs](https://developers.google.com/identity/protocols/oauth2)). The app has to be set to "In production". Whether that triggers verification for the upload scope on a single-user app is [unverified].
4. **Scheduled workflows stop after 60 days without repo activity** in public repos ([GitHub docs](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)). The weekly commits should count as activity [unverified]; `token-check.yml` also warns if the schedule has stopped.
5. **Monetization is not guaranteed.** Ten families and solver-driven variety reduce the repetitive-content risk; they do not remove it.
6. **AI disclosure.** YouTube exempts clearly unrealistic animation, but the project rules ask for disclosure on every upload, so the YouTube flag is set and each description carries one line: "Voice and script assistance are AI-generated."

## Subagents

Used only during Claude Code sessions. Each Phase 3 research subagent cost about 85k tokens, so they are called for parallel build work, not for small edits.

| Subagent | Model | Folder | Input | Output |
|---|---|---|---|---|
| trend-researcher | Haiku 5.5 | `src/trend/` | `data/analytics/*.json` | family weights for next batch |
| scriptwriter | Sonnet 5.5 | `src/script/`, `src/puzzles/*/generator.ts`, `solver.ts` | family spec | generators, solvers, prompt, queue JSON schema, tests |
| voice | Haiku 5.5 | `src/voice/` | queue item | one WAV per sentence + timings JSON |
| visuals | Sonnet 5.5 | `src/visuals/`, `src/puzzles/*/Scene.tsx` | solver steps + timings | Remotion compositions, 9:16 and 16:9 |
| editor | Sonnet 5.5 | `src/edit/` | silent video + WAVs | final MP4 with captions, SFX, music |
| packager | Haiku 5.5 | `src/package/` | queue item + MP4 | thumbnail, per-platform metadata JSON |
| publisher | Sonnet 5.5 | `src/publish/` | MP4 + metadata | platform IDs, review issue |
| analyst | Haiku 5.5 | `src/analytics/` | platform APIs | weekly summary + report issue |

Publisher moved up to Sonnet because OAuth and three upload APIs are the most error-prone code in the project. At most 3 subagents run at once. Each output is checked against its contract with tests and a render, not with a verifier agent.

**Session models:** Sonnet 5.5 for the build and for maintenance; Opus 5.5 only if a bug resists two attempts. Prices as in Phase 1 (Anthropic reference cached 2026-11-03).

## Extensions

None. The `gh` CLI covers repo, secrets, issues and workflow runs. `TOOLS.md` will record that nothing was installed.

## Your manual actions (detailed checklist comes in Phase 5)

1. Create a GitHub account and an empty public repo.
2. Create a Google account and YouTube channel, a Google Cloud project with an OAuth client, and authorize it once.
3. Create an Instagram professional account, a Facebook Page linked to it, a Meta developer app, and authorize it once.
4. Paste these secrets into GitHub: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`, `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_TOKEN`, `IG_USER_ID`, `FB_PAGE_ID`.
5. Approve the first 5 posts per platform.

## Build order after approval

1. Scaffold the repo, `CLAUDE.md`, `.gitignore`, `TOOLS.md`, the 8 agent files.
2. Two puzzle families end to end, then benchmark the render time. Decide Remotion or Manim.
3. Remaining four families, voice, edit, packaging.
4. One local test video in `output/test/`. Stop and show it.
5. Workflows and a cloud dry run. Stop and show the log and duration.

## Changes since approval (2026-11-11)

Decided with the owner after the first test videos:

- **Content:** simple, surprising physics for college students and adults, in a "predict, then watch" format (three choices, thinking timer, simulation, one-sentence reason). This replaces the calculation-style math puzzles listed above.
- **Families:** falling objects, ramp races, pendulums, seesaw, gears, projectiles, collisions, plus the speed-trap calculation family. The magic square is kept in the code but not scheduled.
- **Thinking time:** 6 to 8 seconds with a "pause the video" prompt, up from 3.
- **12-day rule:** an idea (`family:variant`) is never repeated within 12 days. This needs at least 24 ideas; the weekly report shows the count and warns when new variants are needed.
- **Music and SFX:** synthesized by our own code instead of CC0 tracks, so there is nothing to license and each video's music differs.
- **Voice runtime:** kokoro-onnx (Python) with model files from GitHub releases; captions are timed from the script.
- **Data files:** `data/queue.json` and `data/history.json` instead of `published.json`.
- **Schedule switch:** scheduled runs are gated by the repo variable `SCHEDULE_ENABLED`, so the workflows can be pushed before the accounts exist.
- **Instagram upload:** Meta's resumable upload is used, so no public file URL or temporary release is needed.
- **Platforms (later change):** Facebook dropped; YouTube Shorts and Instagram Reels only. Instagram uses Instagram Login (no Facebook Page), with the video served from a temporary GitHub release because that path takes a public URL. The weekly long-form video is off until `LONGFORM_ENABLED` is set.
- **LLM wording:** GitHub Models did not return usable replies from this repo, so narration and titles currently come from the templates.
