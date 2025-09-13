#!/bin/bash


set -e

echo "🚀 Setting up Prompt2Story development environment..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "📦 Installing root dependencies..."
npm install

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created .env file. Please add your OpenAI API key."
else
    echo "✅ .env file already exists."
fi

echo "✅ Setup complete! Next steps:"
echo ""
echo "1. Add your OpenAI API key to .env:"
echo "   OPENAI_API_KEY=your_key_here"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Happy coding! 🎉"
