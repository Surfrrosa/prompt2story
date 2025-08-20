#!/bin/bash
echo "🚀 Setting up Prompt2Story development environment..."

echo "📦 Setting up backend..."
cd backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please add your OPENAI_API_KEY to backend/.env"
    echo "   Get your API key from: https://platform.openai.com/api-keys"
else
    echo "✅ Backend .env file already exists"
fi

echo "📦 Installing backend dependencies..."
poetry install

echo "📦 Setting up frontend..."
cd ../frontend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Frontend .env file created"
else
    echo "✅ Frontend .env file already exists"
fi

echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start development servers:"
echo "   Backend:  cd backend && poetry run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🔍 Health check: curl http://localhost:8000/healthz"
echo ""
echo "⚠️  Don't forget to add your OPENAI_API_KEY to backend/.env!"
