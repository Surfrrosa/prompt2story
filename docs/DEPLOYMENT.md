# Deployment & Operations Runbook

## Pre-Deployment Checklist

### Development Environment
- [ ] Node.js 22+ installed (`node --version`)
- [ ] All dependencies installed (`npm install && cd frontend && npm install`)
- [ ] Environment variables configured (`.env` file with OpenAI API key)
- [ ] Local development server running (`npm run dev`)

### Quality Gates
- [ ] All tests passing (`npm run test:all`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] Code linting clean (`npm run lint`)
- [ ] Test coverage meets 65%+ threshold (`npm run check-coverage`)
- [ ] No security vulnerabilities (`npm audit`)

### Production Readiness
- [ ] Environment variables defined for production
- [ ] CORS origins configured for production domain
- [ ] Rate limiting tested under load
- [ ] Error handling validated in staging environment
- [ ] OpenAI API key rotated and secured

## Deployment Methods

### Vercel Deployment (Recommended)

#### Initial Setup
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project (run in repository root)
vercel link
```

#### Environment Configuration
```bash
# Set production environment variables
vercel env add OPENAI_API_KEY production
vercel env add TEXT_MODEL production  # Optional: defaults to gpt-4o
vercel env add JSON_MODEL production  # Optional: defaults to gpt-4o-mini
vercel env add ALLOWED_ORIGINS production  # Comma-separated origins
```

#### Production Deployment
```bash
# Deploy to production
vercel --prod

# Or via GitHub integration (recommended)
git push origin main  # Triggers automatic deployment
```

### Manual Deployment Process

#### Build Process
```bash
# 1. Build frontend
cd frontend
npm run build
cd ..

# 2. Verify API functions
npm run typecheck

# 3. Run pre-deployment tests
npm run test:all

# 4. Deploy
vercel --prod
```

#### Post-Deployment Verification
```bash
# Test health endpoint
curl https://your-domain.com/api/healthz

# Test CORS headers
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS https://your-domain.com/api/generate-user-stories

# Test rate limiting
for i in {1..35}; do curl https://your-domain.com/api/healthz; done
```

## Environment Configuration

### Production Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | `[REDACTED]` | OpenAI API key with GPT-4o access |
| `TEXT_MODEL` | `gpt-4o` | Model for text generation |
| `JSON_MODEL` | `gpt-4o-mini` | Model for structured responses |
| `ALLOWED_ORIGINS` | `https://yourdomain.com,https://www.yourdomain.com` | Comma-separated CORS origins |
| `NODE_ENV` | `production` | Environment mode |

### Staging Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | `[REDACTED]` | Separate API key for staging |
| `TEXT_MODEL` | `gpt-4o-mini` | Cost optimization for staging |
| `JSON_MODEL` | `gpt-4o-mini` | Cost optimization for staging |
| `ALLOWED_ORIGINS` | `https://staging.yourdomain.com` | Staging domain only |
| `NODE_ENV` | `staging` | Environment mode |

### Development Environment Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | `[REDACTED]` | Development API key |
| `TEXT_MODEL` | `gpt-4o-mini` | Cost optimization for development |
| `JSON_MODEL` | `gpt-4o-mini` | Cost optimization for development |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Local development origins |
| `NODE_ENV` | `development` | Environment mode |

## Monitoring & Health Checks

### Health Endpoint Monitoring

```bash
# Basic health check
curl https://your-domain.com/api/healthz

# Expected response
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "environment": "production",
    "uptime": 12345.67
  },
  "correlationId": "abc-123-def",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Rate Limiting Monitoring

```bash
# Check rate limit headers
curl -I https://your-domain.com/api/healthz

# Expected headers
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995260
```

### Performance Monitoring

Monitor these key metrics:

- **Response Times**: < 2s for generation endpoints
- **Error Rates**: < 1% for 4xx errors, < 0.1% for 5xx errors
- **Rate Limit Hit Rate**: < 5% of requests should hit rate limits
- **OpenAI API Success Rate**: > 99% successful responses

## Troubleshooting Guide

### Common Issues

#### 1. Build Failures

**Symptom**: Deployment fails during build phase
```bash
Error: Process completed with exit code 1
```

**Diagnosis**:
```bash
# Check TypeScript errors
npm run typecheck

# Check for missing dependencies
npm install
cd frontend && npm install

# Verify build locally
npm run build
```

**Resolution**:
- Fix TypeScript compilation errors
- Install missing dependencies
- Verify all imports are correct

#### 2. Environment Variable Issues

**Symptom**: 500 errors on API endpoints
```json
{
  "error": {
    "message": "OpenAI API key not configured",
    "type": "configuration_error"
  }
}
```

**Diagnosis**:
```bash
# Check environment variables
vercel env ls

# Test environment variable access
vercel logs
```

**Resolution**:
```bash
# Add missing environment variable
vercel env add OPENAI_API_KEY production

# Redeploy
vercel --prod
```

#### 3. CORS Issues

**Symptom**: Frontend requests blocked by CORS policy
```
Access to fetch at 'https://api.domain.com' from origin 'https://frontend.domain.com' has been blocked by CORS policy
```

**Diagnosis**:
```bash
# Test CORS preflight
curl -H "Origin: https://your-frontend-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS https://your-api-domain.com/api/generate-user-stories
```

**Resolution**:
```bash
# Update ALLOWED_ORIGINS environment variable
vercel env add ALLOWED_ORIGINS "https://frontend.domain.com,https://www.frontend.domain.com" production
```

#### 4. Rate Limiting False Positives

**Symptom**: Legitimate users hitting rate limits
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "retryAfter": 60
  }
}
```

**Diagnosis**:
- Check rate limit configuration in `src/lib/rate-limiter.ts`
- Monitor rate limit hit patterns
- Verify IP address detection is working correctly

**Resolution**:
- Adjust rate limits for endpoint types
- Implement user-based rate limiting instead of IP-based
- Add rate limit bypass for authenticated users

#### 5. OpenAI API Errors

**Symptom**: Generation failures with OpenAI errors
```json
{
  "error": {
    "message": "OpenAI API error: Rate limit exceeded",
    "type": "openai_error"
  }
}
```

**Diagnosis**:
```bash
# Check OpenAI API status
curl https://status.openai.com/api/v2/status.json

# Check API key quota
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage
```

**Resolution**:
- Monitor OpenAI usage and upgrade plan if needed
- Implement retry logic with exponential backoff
- Consider fallback to different models

## Backup & Recovery

### Data Backup
- No persistent data stored (stateless architecture)
- Environment variables backed up in secure storage
- Code repository serves as source of truth

### Disaster Recovery

#### Complete Service Outage
1. **Identify Issue**: Check Vercel status and logs
2. **Rollback**: Deploy previous working version
3. **Communication**: Update status page if applicable
4. **Investigation**: Analyze logs and metrics

#### Partial Service Degradation
1. **Monitor**: Watch error rates and response times
2. **Scale**: Adjust rate limits if needed
3. **Investigate**: Check OpenAI API status
4. **Optimize**: Implement temporary workarounds

### Recovery Commands
```bash
# Rollback to previous deployment
vercel rollback

# Check deployment history
vercel ls

# View specific deployment logs
vercel logs [deployment-url]
```

## Performance Optimization

### Frontend Optimization
- Enable Vercel Edge Caching for static assets
- Implement service worker for offline capabilities
- Optimize bundle size with code splitting

### Backend Optimization
- Monitor OpenAI token usage and optimize prompts
- Implement response caching for identical requests
- Use appropriate OpenAI models for different tasks

### Infrastructure Optimization
- Configure Vercel Edge Network regions
- Implement health check endpoints for monitoring
- Set up alerts for performance degradation

## Security Considerations

### Deployment Security
- Rotate API keys regularly (monthly recommended)
- Use different API keys for each environment
- Monitor for unusual usage patterns

### Access Control
- Limit Vercel project access to necessary team members
- Use environment-specific deployment keys
- Implement audit logging for configuration changes

### Runtime Security
- Monitor rate limiting effectiveness
- Track correlation IDs for security incident investigation
- Regular dependency updates and security scans

## Scaling Guidelines

### Horizontal Scaling
- Vercel automatically scales serverless functions
- Rate limiting prevents abuse and ensures fair usage
- Consider implementing user authentication for higher limits

### Vertical Scaling
- Monitor OpenAI API usage and costs
- Optimize prompt engineering to reduce token consumption
- Consider caching frequently generated stories

### Future Scaling Considerations
- Implement database for persistent user stories
- Add queue system for background processing
- Consider microservice architecture for complex features