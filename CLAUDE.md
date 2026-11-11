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
- `npm test` runs every family's solver tests.
- `npm run models` downloads the voice model into models/.
- `npm run make -- --family <id> --seed <n> --out output/test [--layout landscape]` renders one video.
- Local Chrome: set `CHROME_PATH` to a chrome-headless-shell binary if Remotion cannot download its own.

## File map
- `src/core/types.ts` contracts: Puzzle, Family, Line, Timeline, VideoProps.
- `src/core/timeline.ts` sentence audio lengths -> frames, countdown, reveal frames, SFX events.
- `src/puzzles/<family>/index.ts` generator + solver + template narration; `Board.tsx` scene; `*.test.ts`.
- `src/puzzles/registry.ts` and `src/visuals/boards.ts` register each family (both must be updated).
- `src/visuals/` Remotion root, layout shell, captions, theme.
- `src/voice/tts.py` voice; `src/edit/mix.py` audio; `src/cli/make.ts` end-to-end render.
- `src/trend|script|package|publish|analytics/` not built yet.
- `.claude/agents/` 8 subagents (models set in each file). Max 3 at once.

## Status (2026-11-11)
Built: magic-square family, full local render (47 s video in about 1 min 45 s on 4 CPUs).
Next: 5 more families, weekly batch + LLM wording, packaging, publishing, workflows.

## Measured
- Voice: about 2 s per sentence. Render: about 70 s for 47 s of 1080x1920 video. Remotion stays; Manim fallback not needed.
