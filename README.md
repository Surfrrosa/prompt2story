# Prompt2Story

AI-powered web application that converts unstructured requirements and design mockups into structured user stories with acceptance criteria.

## Quick Start

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `poetry install`
3. Copy environment template: `cp .env.example .env`
4. Add your OpenAI API key to `.env`
5. Start the server: `poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy environment template: `cp .env.example .env`
4. Update API URL in `.env` if needed (defaults to localhost:8000)
5. Start the development server: `npm run dev`

## Environment Variables

See `.env.example` files in both `backend/` and `frontend/` directories for required configuration.

## Security

See [SECURITY.md](SECURITY.md) for security guidelines and best practices.

## Deployment

Update deployment URLs in `.github/workflows/ops.yml` and `ops/` scripts before deploying to production.
