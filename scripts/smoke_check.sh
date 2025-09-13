#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🔍 Running smoke tests for Prompt2Story..."
echo "Base URL: $BASE_URL"

# If BASE_URL is localhost:3000 and vercel CLI is available, start vercel dev
if [[ "$BASE_URL" == "http://localhost:3000" ]] && command -v vercel >/dev/null; then
    echo "🔄 Starting Vercel dev server..."
    vercel dev --yes --confirm --token="${VERCEL_TOKEN:-}" >/tmp/p2s-vercel.log 2>&1 &
    VC_PID=$!
    trap "kill $VC_PID >/dev/null 2>&1 || true" EXIT
    sleep 4
fi

# Test health endpoint
echo "🩺 Testing health endpoint..."
if command -v jq >/dev/null; then
    curl -fsS "$BASE_URL/api/healthz" | jq . || (echo "❌ Health check failed" && exit 1)
    echo "✅ Health check passed"
else
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/healthz")
    if [ "$response" -eq 200 ]; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed (HTTP $response)"
        exit 1
    fi
fi

# Test user story generation
echo "🧪 Testing user story generation..."
if command -v jq >/dev/null; then
    curl -fsS -X POST "$BASE_URL/api/generate-user-stories" \
        -H "Content-Type: application/json" \
        -d '{"prompt":"As a user, I want to log in so that I can access my account."}' | jq . || (echo "❌ User story generation failed" && exit 1)
    echo "✅ User story generation endpoint working"
else
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$BASE_URL/api/generate-user-stories" \
        -H "Content-Type: application/json" \
        -d '{"prompt": "Create a simple login form", "persona": "EndUser"}')
    if [ "$response" -eq 200 ]; then
        echo "✅ User story generation endpoint working"
    else
        echo "❌ User story generation endpoint failed (HTTP $response)"
        exit 1
    fi
fi

# Test frontend accessibility
echo "🌐 Testing frontend accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$response" -eq 200 ]; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible (HTTP $response)"
    exit 1
fi

echo "🎉 All smoke tests passed!"
