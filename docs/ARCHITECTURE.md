# Architecture Documentation

## System Overview

Prompt2Story is a modern serverless application built for enterprise-scale user story generation. The architecture emphasizes security, scalability, and maintainability through clear separation of concerns.

## Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui components for consistent design
- **Zod** for runtime type validation

### Backend
- **Vercel Serverless Functions** with TypeScript
- **OpenAI GPT-4o** for text generation and GPT-4o-mini for structured data
- **Rate limiting** with in-memory storage and cleanup mechanisms
- **Correlation IDs** for request tracking and debugging

### Infrastructure
- **Vercel Edge Network** for global distribution
- **Environment-based configuration** for security
- **CORS protection** with configurable origins

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Vercel Edge     │    │   OpenAI API    │
│                 │    │  Functions       │    │                 │
│ • Input Forms   │◄───┤                  │◄───┤ • GPT-4o        │
│ • Story Display │    │ • Rate Limiting  │    │ • GPT-4o-mini   │
│ • Error Handling│    │ • Validation     │    │ • Image Analysis│
│                 │    │ • CORS           │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌────────▼────────┐             │
         │              │  Security Layer │             │
         │              │                 │             │
         └──────────────┤ • API Keys      │─────────────┘
                        │ • Rate Limits   │
                        │ • Validation    │
                        │ • Error Tracking│
                        └─────────────────┘
```

## API Design

### Request/Response Flow

1. **Client Request** → Frontend validation → API call with headers
2. **Rate Limiting** → Check request limits by IP and endpoint type
3. **Input Validation** → Zod schema validation with error details
4. **OpenAI Integration** → Model selection and prompt engineering
5. **Response Formation** → Standardized response with correlation ID
6. **Error Handling** → Graceful fallbacks with user-friendly messages

### Endpoint Structure

```
/api/
├── healthz                    # Health check (60 req/min)
├── generate-user-stories      # Main generation (10 req/min)
├── analyze-design            # Image analysis (5 req/min)
└── regenerate-story          # Story refinement (10 req/min)
```

## Security Architecture

### Rate Limiting Strategy

```typescript
// Tier-based rate limiting by endpoint purpose
rateLimiters = {
  health: 60 requests/minute    // High frequency monitoring
  standard: 30 requests/minute  // General API access
  generation: 10 requests/minute // AI-intensive operations
  upload: 5 requests/minute     // Resource-heavy uploads
}
```

### Request Lifecycle

1. **IP-based tracking** with automatic cleanup
2. **Header-based rate limit communication**
3. **Correlation ID generation** for request tracing
4. **Input sanitization** with Zod schemas
5. **Secure error responses** without sensitive data exposure

### Environment Security

- API keys never exposed to frontend
- Environment variables validated at startup
- CORS origins configurable by environment
- No sensitive data in error messages or logs

## Data Flow

### Text Input Processing

```
User Input → Frontend Validation → API Request → Rate Check →
Zod Validation → OpenAI Prompt → Response Processing →
Error Handling → Frontend Update
```

### Image Upload Processing

```
File Upload → Size/Type Validation → Base64 Encoding →
API Request → Rate Check → OpenAI Vision → Text Extraction →
Story Generation → Response Processing → Frontend Display
```

## Component Architecture

### Frontend Structure

```
src/
├── components/
│   ├── InputForm.tsx         # Main user interface
│   ├── StoryCard.tsx         # Story display and actions
│   ├── ErrorBoundary.tsx     # Error handling wrapper
│   └── __tests__/            # Component testing
├── lib/
│   ├── api.ts               # API client with error handling
│   └── types.ts             # Shared TypeScript definitions
└── App.tsx                  # Root component with providers
```

### Backend Structure

```
api/
├── generate-user-stories.ts  # Main story generation
├── analyze-design.ts        # Image processing
├── regenerate-story.ts      # Story refinement
└── healthz.ts              # Health monitoring

src/lib/
├── rate-limiter.ts         # Rate limiting logic
├── api-response.ts         # Standardized responses
├── schemas.ts              # Zod validation schemas
└── __tests__/              # Infrastructure testing
```

## Performance Considerations

### Frontend Optimization
- Code splitting with React.lazy for reduced bundle size
- Image optimization with automatic format selection
- Client-side caching of non-sensitive responses
- Debounced input validation to reduce API calls

### Backend Optimization
- OpenAI model selection based on task complexity
- Request deduplication for identical prompts
- Efficient memory management in rate limiters
- Response streaming for large story generations

### Infrastructure Optimization
- Vercel Edge Functions for global low-latency access
- Automatic scaling based on demand
- CDN distribution for static assets
- DNS optimization for fastest routing

## Error Handling Strategy

### Error Boundaries
- React Error Boundaries catch component errors
- Graceful fallbacks with retry mechanisms
- Development vs production error detail levels
- User-friendly error messages with action suggestions

### API Error Handling
- Correlation IDs for error tracking across systems
- Standardized error response format
- Rate limit headers for client retry logic
- OpenAI error mapping to user-friendly messages

### Monitoring and Observability
- Request/response logging with correlation IDs
- Performance metrics collection
- Error rate monitoring by endpoint
- Rate limit effectiveness tracking

## Testing Strategy

### Coverage Requirements
- 65%+ overall coverage for production confidence
- Unit tests for all utility functions
- Integration tests for API endpoints
- Component tests for user interactions

### Test Architecture
```
tests/
├── api/                     # Backend integration tests
│   ├── rate-limiter.test.ts # Rate limiting edge cases
│   └── api-response.test.ts # Error handling validation
└── frontend/                # Component tests
    ├── InputForm.test.tsx   # User interaction testing
    ├── StoryCard.test.tsx   # Display and copy functionality
    └── ErrorBoundary.test.tsx # Error recovery testing
```

## Deployment Architecture

### Environment Configuration
- **Development**: Local Vercel dev server with hot reload
- **Preview**: Automatic Vercel previews for pull requests
- **Production**: Vercel Edge Network with global distribution

### CI/CD Pipeline
```
Git Push → GitHub → Vercel Build →
Type Checking → Testing → Coverage Validation →
Security Scanning → Deployment → Health Check
```

## Scalability Considerations

### Horizontal Scaling
- Serverless functions auto-scale based on demand
- Rate limiting prevents abuse and ensures fair usage
- CDN distribution reduces origin server load

### Vertical Scaling
- OpenAI API usage optimization through model selection
- Efficient prompt engineering reduces token consumption
- Memory-conscious rate limiter implementation

### Future Scaling
- Database integration ready for persistent storage
- Queue system ready for background processing
- Microservice architecture prepared for service splitting

## Security Model

### Threat Mitigation
- **DDoS Protection**: Rate limiting with automatic IP blocking
- **API Abuse**: Tier-based limits prevent resource exhaustion
- **Data Exposure**: No sensitive data in client-side code
- **Injection Attacks**: Zod validation prevents malformed inputs

### Compliance Ready
- Request logging for audit trails
- Data retention policies configurable
- GDPR-ready with minimal data collection
- SOC2 preparation through comprehensive monitoring