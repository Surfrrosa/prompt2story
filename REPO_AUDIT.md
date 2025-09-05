# Prompt2Story Repository Audit Report

## Repository Tree (Depth 3)

```
prompt2story/
├── main.py                           # 🔍 ROOT FastAPI app
├── backend/
│   ├── app/
│   │   └── main.py                  # 🚨 DUPLICATE FastAPI app
│   ├── prompts/
│   │   ├── user_story_prompt.md     # 🚨 DUPLICATE prompts
│   │   └── design_analysis_prompt.md
│   └── pyproject.toml               # Poetry config
├── frontend/
│   ├── api/                         # 🔍 Vercel serverless functions
│   │   ├── healthz.ts
│   │   ├── generate-user-stories.ts
│   │   ├── analyze-design.ts
│   │   ├── regenerate-story.ts
│   │   └── submit-feedback.ts
│   ├── src/
│   │   ├── main.tsx                 # React entry point
│   │   ├── App.tsx
│   │   └── lib/api.ts               # Frontend API client
│   └── package.json                 # Node.js dependencies
├── prompts/                         # 🚨 DUPLICATE prompts  
│   ├── user_story_prompt.md
│   └── design_analysis_prompt.md
├── fly.toml                         # 🔍 Fly.io deployment config
├── Dockerfile                       # 🔍 Python container
├── vercel.json                      # 🔍 Vercel deployment config
└── package.json                     # 🔍 Root Node.js config
```

## API Routes Location Analysis

### FastAPI Backend Routes (Python)
**Location**: `/main.py` (root) + `/backend/app/main.py` (duplicate)
- `GET /healthz` - Health check
- `POST /generate-user-stories` - Core user story generation
- `POST /regenerate-story` - Single story regeneration  
- `POST /analyze-design` - Image/PDF design analysis

### Vercel Serverless Routes (TypeScript)
**Location**: `/frontend/api/`
- `healthz.ts` - Health endpoint (mirrors FastAPI)
- `generate-user-stories.ts` - User stories (mirrors FastAPI)
- `analyze-design.ts` - Design analysis (mirrors FastAPI)
- `regenerate-story.ts` - Story regeneration (mirrors FastAPI)
- `submit-feedback.ts` - Feedback collection (new)

## Prompts Location Analysis

### Prompt Template Locations
1. **`/prompts/`** (root level)
   - `user_story_prompt.md`
   - `design_analysis_prompt.md`

2. **`/backend/prompts/`** (backend copy)
   - `user_story_prompt.md` (identical content)
   - `design_analysis_prompt.md` (identical content)

**Status**: 🚨 **DUPLICATE CONTENT** - Same prompts in two locations

## Deployment Configuration Analysis

### Fly.io Configuration
- **File**: `fly.toml`
- **Target**: Python FastAPI backend
- **Port**: 8000
- **Healthcheck**: `/healthz`
- **Resources**: 512MB RAM, 1 CPU
- **Auto-scaling**: Enabled

### Vercel Configuration  
- **File**: `vercel.json`
- **Target**: TypeScript serverless functions
- **Runtime**: `nodejs22.x`
- **Functions**: `/frontend/api/**/*.ts`

### Docker Configuration
- **File**: `Dockerfile`
- **Base**: `python:3.12-slim`
- **Command**: `uvicorn main:app` (expects root `/main.py`)
- **Port**: 8000
- **Healthcheck**: `curl localhost:8000/healthz`

## Immediate Conflicts Identified

### 🚨 Critical Conflicts

1. **DUAL BACKEND ARCHITECTURE**
   - FastAPI backend (`/main.py` + `/backend/app/main.py`)
   - Vercel serverless functions (`/frontend/api/`)
   - **Impact**: Unclear which backend is active/deployed

2. **DOCKER PATH MISMATCH**
   - Dockerfile CMD: `uvicorn main:app` (expects root)
   - Backend structure suggests: `backend.app.main:app`
   - **Impact**: Container build may fail or use wrong main.py

3. **DUPLICATE MAIN FILES**
   - `/main.py` (19KB, likely primary)
   - `/backend/app/main.py` (duplicate content)
   - **Impact**: Code maintenance confusion, deployment uncertainty

4. **CONFLICTING DEPLOYMENT TARGETS**
   - `fly.toml` → Fly.io Python deployment
   - `vercel.json` → Vercel Node.js deployment  
   - **Impact**: Cannot deploy to both simultaneously

5. **PROMPT FILE DUPLICATION**
   - `/prompts/` directory (root)
   - `/backend/prompts/` directory (copy)
   - **Impact**: Prompt updates may desync, unclear source of truth

### ⚠️ Architecture Issues

6. **FRONTEND API CONFUSION**
   - Frontend `/lib/api.ts` calls relative `/api/*` endpoints
   - Suggests same-origin deployment (Vercel pattern)
   - But repo also has external FastAPI backend setup
   - **Impact**: Frontend may not connect to intended backend

7. **MIXED ENVIRONMENT PATTERNS**
   - Python `.env` patterns for FastAPI
   - Node.js `VITE_` patterns for frontend
   - **Impact**: Environment setup complexity

## Recommendations

### Immediate Actions Required

1. **Choose Single Backend Strategy**
   - Keep FastAPI (remove Vercel functions) OR
   - Keep Vercel functions (remove FastAPI)

2. **Fix Docker Configuration**
   - If keeping FastAPI: Fix Dockerfile CMD path
   - If removing FastAPI: Remove Dockerfile entirely

3. **Consolidate Duplicate Files**
   - Remove duplicate `main.py` files
   - Consolidate prompts to single location
   - Choose single deployment configuration

4. **Document Architecture Decision**
   - Clearly specify intended deployment target
   - Update README with chosen architecture
   - Remove unused configuration files

### Assessment Summary
**Status**: 🚨 **ARCHITECTURALLY INCONSISTENT**
- Multiple deployment strategies configured simultaneously
- Duplicate backend implementations
- Path mismatches in deployment configuration
- Requires immediate consolidation before production use

**Complexity**: High - Multiple competing architectures
**Risk Level**: High - Deployment failures likely without consolidation
**Effort to Fix**: Medium - Requires choosing and removing one architecture