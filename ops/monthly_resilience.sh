#!/usr/bin/env bash
set -euo pipefail
mkdir -p ops/artifacts
npx autocannon -d 60 -c 50 https://app-huypwpho.fly.dev/healthz > ops/artifacts/loadtest.txt
