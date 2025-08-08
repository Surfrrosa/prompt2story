#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-https://prompt2story.com}"
API_URL="${API_URL:-https://app-huypwpho.fly.dev}"
START=$(date +%s%3N)
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" "$BASE_URL")
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" "$API_URL/healthz")
SSL_DAYS=$(echo | openssl s_client -servername "$(echo "$BASE_URL" | sed -E 's#https?://##;s#/.*$##')" -connect "$(echo "$BASE_URL" | sed -E 's#https?://##;s#/.*$##'):443" 2>/dev/null | openssl x509 -noout -dates | awk -F= '/notAfter/{print $2}' | xargs -I{} date -d "{}" +%s)
NOW=$(date +%s); DIFF_DAYS=$(( (SSL_DAYS-NOW)/86400 ))

echo "home=$HOME_STATUS health=$HEALTH_STATUS ssl_days=$DIFF_DAYS"
home_code=$(echo $HOME_STATUS | awk '{print $1}'); home_t=$(echo $HOME_STATUS | awk '{print $2}')
health_code=$(echo $HEALTH_STATUS | awk '{print $1}'); health_t=$(echo $HEALTH_STATUS | awk '{print $2}')
[ "$home_code" = "200" ] && awk "BEGIN{exit !($home_t<2.0)}" || (echo "FAIL home_code=$home_code"; exit 1)
[ "$health_code" = "200" ] && awk "BEGIN{exit !($health_t<0.6)}" || (echo "FAIL health_code=$health_code"; exit 1)
[ "$DIFF_DAYS" -ge 15 ] || (echo "FAIL ssl_days=$DIFF_DAYS"; exit 1)
