# Checklist env — test reale

File da compilare: `apps/web/.env.local`

Genera chiavi casuali (32+ caratteri) per tutte le `*_ENCRYPTION_KEY` e `SYNC_SECRET`.

**Host locale:** usa sempre `http://127.0.0.1:3000` (non mescolare con `localhost` — cookie e OAuth diversi).

---

## 1. Base obbligatoria

| Variabile | Esempio / formato | Note |
|-----------|-------------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` | Dashboard Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` | Pubblica, va nel browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | **Solo server**, mai nel mobile |
| `NEXT_PUBLIC_USE_DEMO_DATA` | `false` | **Obbligatorio** per uscire dalla demo |
| `NEXT_PUBLIC_APP_URL` | `http://127.0.0.1:3000` | URL canonico per embed form/chat |
| `OPENAI_API_KEY` | `sk-...` | Analisi messaggi/email/WA |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Esplicito, non lasciare implicito |

Verifica: `curl http://127.0.0.1:3000/api/health | jq .supabase.configured` → `true`

Supabase Auth → URL Configuration:
- Site URL: `http://127.0.0.1:3000`
- Redirect URLs: `http://127.0.0.1:3000/**`

---

## 2. Cifratura token (obbligatoria per OAuth)

| Variabile | Esempio |
|-----------|---------|
| `CALENDAR_TOKEN_ENCRYPTION_KEY` | stringa random 32+ char |
| `EMAIL_TOKEN_ENCRYPTION_KEY` | stringa random 32+ char |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | stringa random 32+ char |
| `TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY` | stringa random 32+ char |

```bash
openssl rand -base64 32
```

---

## 3. Google Calendar

### Authorized redirect URIs (Google Cloud)

| Ambiente | URI |
|----------|-----|
| Locale | `http://127.0.0.1:3000/api/calendar/google/callback` |
| Produzione | `https://TUO-DOMINIO/api/calendar/google/callback` |

### `.env.local`

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/calendar/google/callback
```

Scope OAuth: `calendar.events.readonly` + `calendar.events` (leggi + crea eventi dopo approvazione).

Dopo aggiornamento scope: **riconnetti** Google Calendar in Impostazioni.

---

## 4. Gmail

### Authorized redirect URIs

| Ambiente | URI |
|----------|-----|
| Locale | `http://127.0.0.1:3000/api/email/google/callback` |
| Produzione | `https://TUO-DOMINIO/api/email/google/callback` |

### `.env.local`

```env
GOOGLE_GMAIL_CLIENT_ID=123456789-xyz.apps.googleusercontent.com
GOOGLE_GMAIL_CLIENT_SECRET=GOCSPX-...
GOOGLE_GMAIL_REDIRECT_URI=http://127.0.0.1:3000/api/email/google/callback
```

Scope OAuth: `gmail.readonly` + `gmail.send`.

Dopo aggiornamento scope: **riconnetti** Gmail in Impostazioni.

---

## 5. WhatsApp Business Cloud API

Webhook URL: `https://TUO-DOMINIO/api/whatsapp/webhook` (non funziona con solo localhost).

Vedi `docs/PROVIDER_SETUP.md` per variabili `WHATSAPP_*`.

---

## 6. Telegram Bot

```env
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY=...
ENABLE_TELEGRAM_EXECUTION=false
```

Webhook: `https://TUO-DOMINIO/api/telegram/webhook` — configurato automaticamente da Impostazioni → Telegram.

---

## 7. Form e chat sito

Nessuna env aggiuntiva: abilita in Impostazioni → Form sito (genera token) → Chat sito (snippet widget).

---

## 8. Esecuzione — Fase 1 (default sicuro)

```env
EXECUTION_DRY_RUN=true
ENABLE_EMAIL_EXECUTION=false
ENABLE_WHATSAPP_EXECUTION=false
ENABLE_CALENDAR_EXECUTION=false
ENABLE_TELEGRAM_EXECUTION=false
```

## 9. Esecuzione reale — solo dopo smoke test OK

```env
EXECUTION_DRY_RUN=false
ENABLE_EMAIL_EXECUTION=true      # Gmail send
ENABLE_CALENDAR_EXECUTION=true   # Google Calendar create
ENABLE_WHATSAPP_EXECUTION=true   # numeri tester Meta
ENABLE_TELEGRAM_EXECUTION=true   # bot Telegram
```

---

## 10. Checklist rapida post-config

- [ ] `/api/health` → supabase + openai configured
- [ ] Login → redirect a `/dashboard` (non demo `/app`)
- [ ] `/settings` senza login → redirect a `/login?reason=session-expired`
- [ ] Brain con almeno 2–3 servizi
- [ ] Calendar + Gmail connessi e sync OK
- [ ] Dashboard mostra inbox/approvazioni reali
- [ ] Approvazione in dry-run → nessun invio esterno
- [ ] [Opzionale] Form/chat → messaggio → bozza in Dashboard

---

## 11. Cosa NON aspettarsi in Fase 1 (dry-run)

- Bozze create in `/app` demo → **non** compaiono in Dashboard
- Invio email/calendario/WA/Telegram → **bloccato** finché i flag execution sono `false` o `EXECUTION_DRY_RUN=true`
