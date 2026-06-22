#!/usr/bin/env bash
# Verifica rapida setup test reale (locale).
# Uso: ./scripts/verify-real-setup.sh [BASE_URL]
# Esempio: ./scripts/verify-real-setup.sh http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/apps/web/.env.local"

echo "== Soreya real setup check =="
echo "Base URL: $BASE_URL"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "WARN: $ENV_FILE non trovato"
else
  echo "OK: .env.local presente"
  if grep -q '^NEXT_PUBLIC_USE_DEMO_DATA=false' "$ENV_FILE" 2>/dev/null; then
    echo "OK: NEXT_PUBLIC_USE_DEMO_DATA=false"
  else
    echo "WARN: imposta NEXT_PUBLIC_USE_DEMO_DATA=false per uscire dalla demo"
  fi
  if grep -q '^NEXT_PUBLIC_SUPABASE_URL=.\+' "$ENV_FILE" 2>/dev/null; then
    echo "OK: NEXT_PUBLIC_SUPABASE_URL impostato"
  else
    echo "WARN: NEXT_PUBLIC_SUPABASE_URL mancante"
  fi
fi

echo ""
echo "-- /api/health --"
if ! HEALTH=$(curl -sf "$BASE_URL/api/health" 2>/dev/null); then
  echo "FAIL: server non raggiungibile su $BASE_URL"
  echo "Avvia con: cd apps/web && npm run dev -- --hostname 127.0.0.1 --port 3000"
  exit 1
fi

echo "$HEALTH" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('environment:', d.get('environment'))
print('supabase:', d.get('supabase', {}).get('configured'))
print('openai:', d.get('openaiConfigured'))
print('googleCalendar:', d.get('googleCalendarConfigured'))
print('gmail:', d.get('gmailConfigured'))
print('whatsapp:', d.get('whatsappConfigured'))
print('execution dryRun:', d.get('execution', {}).get('dryRun'))
missing = d.get('missingEnvByProvider') or {}
if missing:
    print('missing env by provider:')
    for k, v in missing.items():
        if v:
            print(f'  {k}: {v}')
"

echo ""
echo "-- WhatsApp webhook GET verify (se WHATSAPP_VERIFY_TOKEN in .env.local) --"
if [[ -f "$ENV_FILE" ]]; then
  TOKEN=$(grep '^WHATSAPP_VERIFY_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [[ -n "$TOKEN" ]]; then
    CHALLENGE="soreya-verify-$(date +%s)"
    RESP=$(curl -sf "$BASE_URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${TOKEN}&hub.challenge=${CHALLENGE}" 2>/dev/null || echo "FAIL")
    if [[ "$RESP" == "$CHALLENGE" ]]; then
      echo "OK: webhook verify token accettato"
    else
      echo "FAIL: webhook verify atteso '$CHALLENGE', ricevuto '$RESP'"
    fi
  else
    echo "SKIP: WHATSAPP_VERIFY_TOKEN non impostato"
  fi
else
  echo "SKIP: .env.local assente"
fi

echo ""
echo "Done."
