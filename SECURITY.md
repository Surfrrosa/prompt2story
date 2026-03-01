# Security Guidelines

## Environment Variables

This application requires the following environment variables:

### Backend (.env)
- `OPENAI_API_KEY`: Your OpenAI API key for generating user stories

### Frontend (.env)
- `VITE_API_URL`: URL of your backend API deployment

## Secrets Management

- **NEVER** commit actual API keys or secrets to version control
- Use `.env.example` files to document required environment variables
- Store production secrets in your deployment platform's secret management system
- Rotate API keys regularly and after any potential exposure

## GitHub Actions Secrets

The following secrets need to be configured in your GitHub repository settings:
- `SLACK_WEBHOOK_URL`: Optional webhook for monitoring alerts

## Deployment URLs

Update the following files with your actual deployment URLs:
- `.github/workflows/ops.yml`: Update BASE_URL, API_URL, API_URL_STAGING
- `ops/` scripts: Update default URLs in health check and performance monitoring scripts

## Vulnerability Assessments

### ajv ReDoS (GHSA-2g4f-4pwh-qvx6) -- Acknowledged, not actionable
- Severity: Medium (CVSS)
- Actual risk: None for this project
- ajv appears as transitive dep of @vercel/node (via @vercel/static-config)
  and eslint (via @eslint/eslintrc, dev-only)
- This project uses Zod for all input validation. No user input flows to ajv.
- The ReDoS requires the $data option which is not used in our dependency chain.
- Fix depends on upstream: @vercel/node and eslint updating their ajv dependency.
- npm audit fix --force would downgrade @vercel/node to 2.1.0 (breaking).
- Assessed: 2026-02-28. Re-check when @vercel/node or eslint release updates.
