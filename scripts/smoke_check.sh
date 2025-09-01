#!/bin/bash
# Smoke test for Prompt2Story backend
set -e

echo "🔄 Starting Prompt2Story smoke check..."

# Start FastAPI server in background
echo "🚀 Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server startup..."
sleep 5

# Test health endpoint
echo "🩺 Testing health endpoint..."
if curl -f http://localhost:8000/healthz; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Test basic API endpoint
echo "🧪 Testing API endpoints..."
if curl -f -X POST http://localhost:8000/generate-user-stories \
    -H "Content-Type: application/json" \
    -d '{"text": "test", "include_metadata": false}' > /dev/null; then
    echo "✅ API endpoint test passed"
else
    echo "⚠️  API endpoint test failed (may need OPENAI_API_KEY)"
fi

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID

echo "🎉 Smoke check completed successfully!"