# Prompt2Story

AI-powered user story generator. Takes meeting notes or design mockups, outputs structured user stories with acceptance criteria using OpenAI GPT-4o.

See [README.md](README.md) for project overview.

## Session Protocol

**Before starting any work, read the latest session log in `docs/sessions/`.**

Write a session log before ending every session. Format: `docs/sessions/YYYY-MM-DD_session.md`

## Key Files

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Main app component |
| `frontend/src/lib/api.ts` | API client functions |
| `frontend/src/components/ui/` | shadcn/ui components |
| `frontend/package.json` | Frontend dependencies |

### Backend (Vercel Functions)
| File | Purpose |
|------|---------|
| `api/generate-user-stories.ts` | Main generation endpoint |
| `api/analyze-design.ts` | Design/image analysis endpoint |
| `api/regenerate-story.ts` | Story refinement endpoint |
| `api/_env.ts` | Centralized env & CORS helpers |
| `src/lib/schemas.ts` | Zod validation schemas |
| `src/lib/rate-limiter.ts` | Rate limiting logic |

### AI Prompts
| File | Purpose |
|------|---------|
| `prompts/user_story_prompt.md` | Main generation prompt |
| `prompts/design_analysis_prompt.md` | Design analysis prompt |

### Documentation
| File | Purpose |
|------|---------|
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/API.md` | API endpoint documentation |
| `docs/DEPLOYMENT.md` | Deployment procedures |
| `SECURITY.md` | Security guidelines |

## Running

```bash
# Install dependencies
npm install
npm --prefix frontend install

# Copy env template and add your OpenAI API key
cp .env.example .env

# Start dev server (frontend + serverless functions)
npm run dev

# Run tests
npm run test

# Build
npm run build
```

## Domain Rules

- All API inputs must be validated with Zod schemas before processing.
- OpenAI API key must never be exposed to the frontend. It lives only in serverless functions.
- Rate limiting is tier-based: health (60/min), standard (30/min), generation (10/min), upload (5/min).
- All API responses use the standardized wrapper with `correlationId` and `timestamp`.

## Known Technical Debt

### ~~Monolithic App.tsx~~ (Resolved)
Split into QuickGenerate component tree (7 components, 4 hooks, 1 types file).
App.tsx is now 87 lines.

### In-memory rate limiter (Low -- acceptable for current scale)
Works for dev and low-traffic production on Vercel. Resets on cold starts,
which means rate limits are per-instance and not globally consistent. This is
acceptable for abuse prevention (not precision metering) at current traffic
levels. When traffic justifies it, upgrade to Vercel KV (Redis-compatible).
No code changes required for the migration -- only the store backend changes.
Files affected: `src/lib/rate-limiter.ts`

## Dependencies

All dependencies must be pinned to exact versions. No `^` or `~` prefixes.

When adding a dependency:
1. Verify it's necessary
2. Pin the exact version
3. Document why it was added if non-obvious

## Security

### Checklist
- [x] OpenAI API key in .env only (never committed, never in frontend)
- [x] CORS restricted to allowed origins
- [x] Rate limiting on all endpoints
- [x] Input validation with Zod on all API inputs
- [x] Security headers configured in vercel.json
- [x] No secrets in version control
