#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-https://prompt2story.com}"
API_URL="${API_URL:-https://app-huypwpho.fly.dev}"
API_P95_TARGET_MS="${API_P95_TARGET_MS:-600}"

curl_opts=(-sS -L --max-time 10 --retry 2 --retry-delay 1 -o /dev/null -w "%{http_code} %{time_total}")

HOME_STATUS=$(curl "${curl_opts[@]}" "$BASE_URL")
HEALTH_STATUS=$(curl "${curl_opts[@]}" "$API_URL/healthz")

SSL_DAYS=$(echo | openssl s_client -servername "$(echo "$BASE_URL" | sed -E 's#https?://##;s#/.*$##')" -connect "$(echo "$BASE_URL" | sed -E 's#https?://##;s#/.*$##'):443" 2>/dev/null | openssl x509 -noout -dates | awk -F= '/notAfter/{print $2}' | xargs -I{} date -d "{}" +%s)
NOW=$(date +%s); DIFF_DAYS=$(( (SSL_DAYS-NOW)/86400 ))

echo "home=$HOME_STATUS health=$HEALTH_STATUS ssl_days=$DIFF_DAYS api_target_ms=$API_P95_TARGET_MS"

home_code=$(awk '{print $1}' <<<"$HOME_STATUS"); home_t=$(awk '{print $2}' <<<"$HOME_STATUS")
health_code=$(awk '{print $1}' <<<"$HEALTH_STATUS"); health_t=$(awk '{print $2}' <<<"$HEALTH_STATUS")

API_TARGET_S=$(echo "scale=3; $API_P95_TARGET_MS / 1000" | bc)

[[ "$home_code" =~ ^(20|30)[0-9]$ ]] || { echo "FAIL home_code=$home_code"; exit 1; }
awk "BEGIN{exit !($home_t<2.0)}" || { echo "FAIL home_time=$home_t"; exit 1; }
[[ "$health_code" =~ ^(20|30)[0-9]$ ]] || { echo "FAIL health_code=$health_code"; exit 1; }
awk "BEGIN{exit !($health_t<$API_TARGET_S)}" || { echo "FAIL health_time=$health_t (threshold: ${API_TARGET_S}s)"; exit 1; }
[ "$DIFF_DAYS" -ge 15 ] || (echo "FAIL ssl_days=$DIFF_DAYS"; exit 1)
