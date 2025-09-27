#!/bin/bash

echo "🧪 Running Comprehensive Test Suite"
echo "=================================="

# Set NODE_ENV for testing
export NODE_ENV=test

echo "📦 Installing dependencies..."
echo ""

echo "🔧 Root package dependencies..."
npm install --no-audit --no-fund

echo "🎨 Frontend dependencies..."
cd frontend && npm install --no-audit --no-fund && cd ..

echo ""
echo "🚀 Running API tests..."
echo "----------------------"
npm run test

echo ""
echo "🎨 Running frontend tests..."
echo "------------------------"
cd frontend && npm run test:run && cd ..

echo ""
echo "📊 Generating coverage reports..."
echo "-------------------------------"
echo "API coverage generated in: coverage/"
echo "Frontend coverage generated in: frontend/coverage/"

echo ""
echo "✅ Test suite complete!"
echo "======================"