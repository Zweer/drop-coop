#!/usr/bin/env bash
set -euo pipefail

WEBM=$(find demo-results -name 'video.webm' -type f 2>/dev/null | head -1)

if [ -z "$WEBM" ]; then
  echo "No demo video found. Running: npm run demo"
  npm run demo
  WEBM=$(find demo-results -name 'video.webm' -type f | head -1)
fi

if [ -z "$WEBM" ]; then
  echo "Error: demo recording failed" >&2
  exit 1
fi

OUT="packages/web/static/demo.gif"
mkdir -p packages/web/static

echo "Converting $WEBM → $OUT"
ffmpeg -y -i "$WEBM" \
  -vf "fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" \
  -loop 0 "$OUT"

echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
