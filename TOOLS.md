# Tools and extensions

## Claude Code extensions (skills, plugins, MCP servers)

None installed. The `gh` CLI covers the repo, secrets, issues and workflow runs, so no extension was justified. (Checked 2026-11-11.)

## Pipeline dependencies (plain code, used by the cloud runner)

| Tool | Source | Purpose |
|---|---|---|
| Remotion 4.0.542 | npm | Renders the animation |
| React 18.3.1 | npm | Required by Remotion |
| @fontsource/inter | npm | Font files |
| tsx, TypeScript | npm | Runs the TypeScript code |
| kokoro-onnx 0.6.1 | PyPI | Text-to-speech runtime |
| Kokoro v1.0 model files | GitHub release of thewh1teagle/kokoro-onnx | Voice model, stock voice `am_michael` |
| numpy, soundfile | PyPI | Audio mix, generated SFX and music |
| FFmpeg | system package | Mux and loudness |
