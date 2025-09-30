#!/bin/bash

echo "Testing Prompt2Story Streaming API"
echo "===================================="
echo ""

# Test data
TEST_PAYLOAD='{
  "text": "As a user, I want to be able to reset my password so that I can regain access to my account if I forget it.",
  "include_metadata": false,
  "infer_edge_cases": false,
  "include_advanced_criteria": false,
  "expand_all_components": false,
  "stream": true
}'

echo "Sending test request with streaming enabled..."
echo ""

curl -N -X POST "https://www.prompt2story.com/api/generate-user-stories" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "$TEST_PAYLOAD" \
  2>&1

echo ""
echo ""
echo "Test complete!"