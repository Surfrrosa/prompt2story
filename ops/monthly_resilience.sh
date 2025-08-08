#!/usr/bin/env bash
set -euo pipefail
API_URL_STAGING="${API_URL_STAGING:-https://app-huypwpho.fly.dev}"
mkdir -p ops/artifacts
npx autocannon -d 60 -c 50 "$API_URL_STAGING/healthz" > ops/artifacts/loadtest.txt
