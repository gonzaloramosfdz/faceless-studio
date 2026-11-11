#!/usr/bin/env bash
# Downloads the Kokoro voice model (about 340 MB) into models/. Cached in CI.
set -euo pipefail
mkdir -p models && cd models
base=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f kokoro-v1.0.onnx ] || curl -fsSL -o kokoro-v1.0.onnx "$base/kokoro-v1.0.onnx"
[ -f voices-v1.0.bin ] || curl -fsSL -o voices-v1.0.bin "$base/voices-v1.0.bin"
