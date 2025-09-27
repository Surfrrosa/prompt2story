# Prompt2Story

> **Enterprise-grade AI-powered user story generator with comprehensive security and testing**

Transform meeting notes, requirements, or design mockups into structured user stories using OpenAI's GPT-4o. Built with production-ready security, rate limiting, comprehensive testing, and professional error handling.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue)](https://www.typescriptlang.org/)
[![Testing](https://img.shields.io/badge/Coverage-65%25+-green)](vitest)
[![Security](https://img.shields.io/badge/Security-Hardened-green)](docs/SECURITY.md)
[![Made with](https://img.shields.io/badge/Made_with-❤️_and_AI-red.svg)](https://github.com/Surfrrosa/prompt2story)

> **Architecture at a glance**
> - Frontend: `/frontend` (Vite + React + Tailwind + shadcn)
> - API (serverless on Vercel): `/api` (TypeScript)
> - Shared types/schemas: `/src/lib` (Zod)
> - Env usage: Only serverless routes read `OPENAI_API_KEY` (never expose it to the browser).

## Features

### 🎯 Core Functionality
- **Dual Input Modes**: Text prompts or design image uploads
- **AI-Powered Generation**: Uses OpenAI GPT-4o for intelligent story creation
- **Structured Output**: Generates properly formatted user stories with acceptance criteria
- **Edge Case Detection**: Identifies potential issues and considerations
- **Metadata Support**: Optional priority levels and story point estimates

### 🔒 Enterprise Security
- **Rate Limiting**: Tier-based protection (5-60 requests/minute by endpoint)
- **API Security**: Correlation IDs, standardized error handling, request validation
- **Credential Protection**: Secure environment variable management
- **CORS Protection**: Configurable origin allowlists

### 🧪 Quality Assurance
- **65%+ Test Coverage**: Comprehensive test suite with Vitest + React Testing Library
- **Type Safety**: Full TypeScript with strict mode and Zod validation
- **Error Boundaries**: Graceful error handling with user-friendly fallbacks
- **Performance Monitoring**: Request tracking and optimization

### 🎨 Modern Architecture
- **Clean UI**: React 18 + Tailwind CSS + shadcn/ui components
- **Serverless**: Vercel edge functions for global scalability
- **Responsive Design**: Mobile-first with accessibility standards
- **Developer Experience**: Hot reload, TypeScript IntelliSense, comprehensive tooling

## Quick Start

### Prerequisites

- Node.js 22+ (check with `node --version`)
- npm/yarn/pnpm package manager
- OpenAI API key with GPT-4o access
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Surfrrosa/prompt2story.git
   cd prompt2story
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your OpenAI API key
   echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
   ```

4. **Development server**
   ```bash
   # Start Vercel development server
   npm run dev
   ```

## Usage

1. **Text Input**: Enter meeting notes, requirements, or feature descriptions
2. **Design Upload**: Upload wireframes, mockups, or design images  
3. **Configure Options**: 
   - Include advanced acceptance criteria
   - Add priority and story point metadata
   - Expand component details
4. **Generate Stories**: AI processes input and creates structured user stories
5. **Review & Refine**: Edit generated stories or regenerate with feedback

## API Endpoints

### Generate User Stories
```http
POST /api/generate-user-stories
Content-Type: application/json

{
  "prompt": "Create a user login system with email verification",
  "context": "Mobile-first e-commerce app",
  "persona": "EndUser",
  "include_advanced_criteria": true,
  "include_metadata": true
}
```

### Analyze Design
```http
POST /api/analyze-design
Content-Type: multipart/form-data

image: [uploaded file]
include_advanced_criteria: true
expand_all_components: true
```

### Regenerate Story
```http
POST /api/regenerate-story
Content-Type: application/json

{
  "original_input": "...",
  "current_story": {...},
  "feedback": "Make it more specific",
  "include_metadata": true
}
```

## Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: React hooks with context for global state
- **API Client**: Fetch-based with error handling and loading states

### Backend
- **Runtime**: Node.js serverless functions on Vercel
- **API Framework**: Vercel Functions with TypeScript
- **AI Integration**: OpenAI GPT-4o and GPT-4o-mini models
- **Validation**: Zod schemas for type-safe API contracts
- **Error Handling**: Comprehensive error boundaries and logging

### Deployment
- **Frontend**: Vercel static hosting with automatic deployments
- **Backend**: Vercel serverless functions with edge runtime
- **Environment**: Production-ready with environment variable management
- **Monitoring**: Built-in Vercel analytics and error tracking

## Development

### Project Structure
```
prompt2story/
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── lib/        # Utilities and API client
│   │   └── App.tsx     # Main application component
│   └── package.json
├── api/                # Vercel serverless functions
│   ├── generate-user-stories.ts
│   ├── analyze-design.ts
│   ├── regenerate-story.ts
│   └── _env.ts         # Environment helpers
├── src/lib/            # Shared schemas and utilities
├── prompts/            # AI prompt templates
└── package.json        # Root dependencies
```

### Scripts

```bash
# Development
npm run dev              # Start Vercel dev server with hot reload
npm run build           # Build for production (frontend + API)

# Testing & Quality
npm run test            # Run API tests (Vitest)
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:all        # Run comprehensive test suite (API + Frontend)
npm run typecheck       # TypeScript type checking
npm run lint            # ESLint code analysis
npm run format          # Prettier code formatting
npm run check-coverage  # Validate coverage thresholds

# Utilities
npm run check-cruft     # Check for legacy artifacts
```

### Testing Strategy

Our comprehensive test suite ensures production reliability:

```bash
# Run full test suite with coverage
npm run test:all

# API testing (Vitest)
npm run test            # Unit + integration tests
npm run test:coverage   # With coverage report

# Frontend testing (React Testing Library)
cd frontend && npm run test:run

# Quality checks
npm run typecheck       # TypeScript validation
npm run lint           # Code quality analysis
npm run check-coverage  # Validate 65%+ coverage threshold
```

**Test Coverage Standards:**
- API routes: Unit + integration testing with OpenAI mocking
- React components: User interaction + accessibility testing
- Rate limiting: Edge cases + security validation
- Error handling: Comprehensive error boundary testing

## Deployment

### Vercel (Recommended)

1. **Connect repository** to Vercel dashboard
2. **Set environment variables**:
   ```
   OPENAI_API_KEY=your_key_here
   TEXT_MODEL=gpt-4o
   JSON_MODEL=gpt-4o-mini
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
3. **Deploy**: Automatic deployments on push to main

### Manual Deployment

```bash
# Build and deploy
npm run build
npx vercel --prod
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key with GPT-4o access | ✅ | - |
| `TEXT_MODEL` | Model for text generation | ❌ | `gpt-4o` |
| `JSON_MODEL` | Model for JSON responses | ❌ | `gpt-4o-mini` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | ❌ | `https://prompt2story.com` |
| `NODE_ENV` | Environment mode | ❌ | `development` |

### Security Configuration

The application includes enterprise-grade security features:

- **Rate Limiting**: Tiered by endpoint type (health: 60/min, generation: 10/min, upload: 5/min)
- **Request Validation**: Zod schema validation for all API inputs
- **Error Handling**: Correlation IDs for request tracking and debugging
- **CORS Protection**: Configurable origin allowlists for production security

### Customization

- **Prompts**: Edit files in `prompts/` directory
- **Schemas**: Modify validation in `src/lib/schemas.ts`
- **UI Components**: Customize in `frontend/src/components/`
- **API Logic**: Update serverless functions in `api/`

## Troubleshooting

### Common Issues

**Build fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API errors**
- Verify OpenAI API key is set correctly
- Check Vercel function logs for detailed errors
- Ensure CORS origins are configured properly

**TypeScript errors**
```bash
# Run type checking
npm run typecheck

# Update dependencies
npm update
```

### Performance

- **Frontend**: Uses code splitting and lazy loading
- **API**: Optimized with response caching and efficient prompts
- **Images**: Automatic compression and format optimization

## Testing Checklist

### Manual Testing
- [ ] Text input generates valid user stories
- [ ] Design upload works with common image formats
- [ ] Story regeneration improves based on feedback
- [ ] All form validations work correctly
- [ ] Error states display helpful messages
- [ ] Loading states provide good UX
- [ ] Responsive design works on mobile/desktop

### API Testing
- [ ] All endpoints return proper HTTP status codes
- [ ] CORS headers allow frontend access
- [ ] Input validation rejects invalid requests
- [ ] OpenAI integration handles rate limits gracefully
- [ ] Error responses include helpful details

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/Surfrrosa/prompt2story/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Surfrrosa/prompt2story/discussions)
- **Email**: support@prompt2story.com
