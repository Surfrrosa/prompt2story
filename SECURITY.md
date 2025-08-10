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
