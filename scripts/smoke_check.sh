#!/usr/bin/env bash
set -euo pipefail

echo "🔄 Starting Prompt2Story smoke check (Vercel dev)..."
if ! command -v vercel >/dev/null; then
  echo "❌ vercel CLI not found. Install with: npm i -g vercel" && exit 1
fi

echo "ⓘ Launching vercel dev in background..."
vercel dev --yes --confirm --token="${VERCEL_TOKEN:-}" >/tmp/p2s-vercel.log 2>&1 &
VC_PID=$!
trap "kill $VC_PID >/dev/null 2>&1 || true" EXIT
sleep 4

echo "🧪 GET /api/healthz"
curl -fsS http://localhost:3000/api/healthz | jq . || (echo "healthz failed" && exit 1)

echo "🧪 POST /api/generate-user-stories"
curl -fsS -X POST http://localhost:3000/api/generate-user-stories \
  -H "Content-Type: application/json" \
  -d '{"prompt":"As a user, I want to log in so that I can access my account."}' | jq . || (echo "generate-user-stories failed" && exit 1)

echo "✅ Smoke check complete"