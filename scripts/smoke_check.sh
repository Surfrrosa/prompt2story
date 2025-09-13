#!/bin/bash

# Smoke test script for Prompt2Story

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🔍 Running smoke tests for Prompt2Story..."
echo "Base URL: $BASE_URL"

# Test health endpoint
echo "Testing health endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/healthz")
if [ "$response" -eq 200 ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $response)"
    exit 1
fi

echo "Testing user story generation..."
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

echo "Testing frontend accessibility..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$response" -eq 200 ]; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible (HTTP $response)"
    exit 1
fi

echo "🎉 All smoke tests passed!"
