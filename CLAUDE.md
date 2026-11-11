# faceless-studio

Automated math and logic puzzle channel. English. YouTube (Shorts + weekly long-form), Instagram Reels, Facebook Reels. Budget $0. Public repo. Full plan: PLAN.md. Research cache: research/ (reuse if under 30 days old).

## Rules that always apply
- The daily pipeline is plain code. No Claude session, no extensions.
- Code generates and solves every puzzle. The LLM only words narration and metadata; a template is the fallback.
- Never commit, print or log secrets. Check `.gitignore` before each commit. Rendered media never enters the repo.
- Official platform APIs only. No paid tools.
- Stop and ask before: first push, enabling schedules, publishing outside the review flow, anything needing app review.

## Stack
Node 22 + TypeScript (tsx), Remotion 4 for visuals, Python (kokoro-onnx) for voice, numpy for SFX/music/mix, FFmpeg for mux.

## Commands
- `npm test` runs every family's solver tests plus planner and wording tests.
- `npm run models` downloads the voice model into models/.
- `npm run make -- --family <id> --seed <n> --out output/test [--layout landscape]` renders one video.
- `npx tsx src/cli/batch.ts --days 7` plans posts into data/queue.json (LLM wording if GITHUB_TOKEN is set, else template).
- `npx tsx src/cli/post.ts --dry-run` renders the next due post without uploading.
- Local Chrome: set `CHROME_PATH` to a chrome-headless-shell binary if Remotion cannot download its own.
- Local secrets for testing: `.env` (gitignored), run with `node --env-file=.env --import tsx <file>`.

## How a puzzle works
"Predict, then watch": setup, three choices, thinking timer, the simulation plays, one-sentence reason. Each family is `src/puzzles/<id>/index.ts` (generator + physics + template narration), `Board.tsx` (SVG simulation), `<id>.test.ts` (300 seeds checked against an independent simulation). Reference family: `freefall`.
- `key` is `family:variant:params`; `family:variant` is the idea. The planner never repeats an idea within 12 days (needs 24+ ideas) and never repeats a key.
- Lines: h1, h2 (hook), s0 (step 0, simulation plays), s1 (answer), s2 (why), f1 (final).
- `magic-square` and `motion` are older calculation-style families; `magic-square` is excluded from rotation in `src/script/plan.ts`.

## File map
- `src/core/` types, rng, timeline, render (end-to-end video), util (dates, json, http).
- `src/puzzles/<family>/`, `src/puzzles/registry.ts`, `src/visuals/boards.ts` (register a family in both).
- `src/visuals/` Remotion root, Shell (layout), Captions, quiz (useSimTime, Choices, Fact), Work, theme.
- `src/voice/tts.py` Kokoro voice; `src/edit/mix.py` voice + generated SFX and music.
- `src/script/` queue model, plan (weekly planner), wording (one LLM call, validated, template fallback).
- `src/package/metadata.ts` per-platform text + AI disclosure.
- `src/publish/` youtube, meta (Instagram + Facebook Reels), github (issues).
- `src/analytics/report.ts` weekly stats, family weights, report issue.
- `src/cli/` make, batch, post, approve, longform, tokencheck.
- `.github/workflows/` post (2x daily), weekly, publish-approved, token-check; `.github/actions/` setup, finish.
- `data/` queue.json, history.json (dedup record), review.json, weights.json, analytics/.
- Docs: PLAN.md, RUNBOOK.md (operate), SETUP.md (accounts and secrets), TOOLS.md, licenses.md.
- `.claude/agents/` 8 subagents (models set in each file). Max 3 at once.

## Measured (4-CPU machine, same size as the public-repo runner)
- Voice about 2 s per sentence plus about 10 s model load. Render about 60 to 80 s for a 40 to 60 s video. Whole video under 2 minutes.

## Cloud status (2026-11-11)
- Repo: github.com/gonzaloramosfdz/faceless-studio (public). `gh` GraphQL is blocked in Claude sessions: use `gh api` REST calls.
- Post dry run on GitHub Actions passes: about 2 min warm, 2.5 min cold. Caches work.
- GitHub Models returns a plain "OK" body (HTTP 200, text/plain) for every request from this repo, including the catalog. LLM wording therefore falls back to the template. Unresolved; do not spend time on it without new information.
- Not yet tested: real uploads (no platform secrets yet), weekly workflow, publish-approved, login check.
