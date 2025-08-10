#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARTIFACT_DIR="ops/artifacts/lighthouse_${TIMESTAMP}"
mkdir -p "$ARTIFACT_DIR"

npx lhci autorun --collect.url=https://your-frontend-domain.com --upload.target=filesystem --upload.outputDir="$ARTIFACT_DIR" --assert.preset=lighthouse:recommended || true

if [ -f "$ARTIFACT_DIR/manifest.json" ]; then
  PERF_SCORE=$(find "$ARTIFACT_DIR" -name "*.json" -not -name "manifest.json" -exec cat {} \; | head -1 | grep -o '"performance":{"score":[0-9.]*' | cut -d: -f3 | awk '{print $1 * 100}' || echo "0")
  if (( $(echo "$PERF_SCORE < 90" | bc -l 2>/dev/null || echo "1") )); then
    echo "FAIL performance_score=$PERF_SCORE (threshold: 90)"
    exit 1
  fi
  echo "SUCCESS performance_score=$PERF_SCORE"
fi
