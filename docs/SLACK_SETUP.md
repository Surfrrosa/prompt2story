# Slack Integration Setup

## Adding SLACK_WEBHOOK_URL Secret

To enable Slack notifications for observability monitoring alerts, you need to add the `SLACK_WEBHOOK_URL` as a GitHub Actions secret.

### Steps:

1. **Create Slack Incoming Webhook:**
   - Go to your Slack workspace
   - Navigate to Apps → Incoming Webhooks
   - Create a new webhook for the `#alerts` channel (or your preferred channel)
   - Copy the webhook URL

2. **Add GitHub Secret:**
   - Go to your GitHub repository: `https://github.com/Surfrrosa/prompt2story`
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK_URL`
   - Value: Paste your Slack webhook URL
   - Click "Add secret"

### Notification Types:

- **🚨 Daily Health Check Failed** - Daily at 7:30 AM UTC
- **🔥 URGENT: Hourly Watchdog Alert** - Every hour (critical alerts)
- **📊 Weekly Performance Check Failed** - Mondays at 8:00 AM UTC  
- **🧪 Monthly Resilience Test Failed** - 1st of month at 9:00 AM UTC

### Channel Configuration:

The notifications are currently configured to post to `#alerts` channel. To change this:
1. Edit `.github/workflows/ops.yml`
2. Update the `channel: '#alerts'` line in each Slack notification step
3. Commit and push the changes

### Testing:

You can manually trigger any monitoring check to test Slack notifications:
- Go to Actions tab in GitHub
- Select "Observability and Performance Monitoring" workflow
- Click "Run workflow" and choose the check type

The notifications will only be sent if the monitoring thresholds are breached (script exits with code 1).
