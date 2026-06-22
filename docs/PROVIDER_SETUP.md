# Provider Setup

This guide is intentionally operational and ordered for a safe production connection. Keep real execution disabled while completing these steps.

## Supabase

1. Create a Supabase project.
2. Apply SQL migrations from `supabase/migrations` in filename order (one file per SQL Editor run, or Supabase CLI).
   - PostgreSQL requires enum `ADD VALUE` to commit before new values appear in indexes. Migrations `20260507002001` and `20260507003001` exist for that reason—do not skip them.
3. Enable and review RLS policies.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the web environment.
5. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the mobile environment.

## OpenAI

1. Create an API key.
2. Set `OPENAI_API_KEY`.
3. Set `OPENAI_MODEL` explicitly, even if the code has a fallback.
4. Test analysis flows before provider sync is enabled.

## Google OAuth Calendar

1. Create OAuth credentials in Google Cloud.
2. Add redirect URL: `/api/calendar/google/callback`.
3. OAuth scopes requested by Soreya: `calendar.events.readonly` + `calendar.events` (read + create/update events after approval).
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and `CALENDAR_TOKEN_ENCRYPTION_KEY`.
5. Connect from Settings. If Calendar was connected before write was enabled, disconnect and reconnect to grant `calendar.events`.
6. For real calendar write tests: `ENABLE_CALENDAR_EXECUTION=true` and `EXECUTION_DRY_RUN=false` only in a controlled environment.

## Website form ingest

1. Apply migration `20260616100000_website_form_channel.sql`.
2. In **Settings → Form sito web**, enable ingest and copy the token + HTML snippet.
3. Public endpoint: `POST /api/website/form` with header `X-Soreya-Form-Token`.
4. Payload fields: `organizationSlug`, `name`, `email`, `phone`, `message`, `service`, `preferredDateTime`, `pageUrl`.
5. Submissions flow into Dashboard inbox and approval queue (email reply + calendar proposal when applicable).

## Website chat ingest

1. Apply migration `20260616110000_website_chat.sql`.
2. In **Settings → Form sito web**, generate the ingest token (shared with chat).
3. In **Settings → Chat sito web**, enable chat and copy the widget snippet.
4. Public endpoints (all require header `X-Soreya-Form-Token`):
   - `POST /api/website/chat/session` — create visitor session (`organizationSlug`, optional `visitorName`, `visitorEmail`, `pageUrl`)
   - `POST /api/website/chat/message` — visitor message (`sessionToken`, `message`)
   - `GET /api/website/chat/messages?sessionToken=...` — poll messages (`after` optional)
5. Staff can reply via `POST /api/organization/website-chat/reply` (`sessionId`, `bodyText`).
6. Incoming visitor messages flow into Dashboard inbox and approval queue like form submissions.

## Google OAuth Gmail

1. Prefer dedicated Gmail OAuth credentials.
2. Add redirect URL: `/api/email/google/callback`.
3. OAuth scopes requested by Soreya: `gmail.readonly` + `gmail.send` (read + send replies after approval).
4. Set `GOOGLE_GMAIL_CLIENT_ID`, `GOOGLE_GMAIL_CLIENT_SECRET`, `GOOGLE_GMAIL_REDIRECT_URI` and `EMAIL_TOKEN_ENCRYPTION_KEY`.
5. Connect from Settings. If Gmail was connected before send was enabled, disconnect and reconnect to grant `gmail.send`.
6. For real send tests: `ENABLE_EMAIL_EXECUTION=true` and `EXECUTION_DRY_RUN=false` only in a controlled environment.

## Microsoft Azure App Registration

1. Create app registrations for Calendar and Mail, or one carefully scoped app if you accept shared credentials.
2. Add redirect URLs: `/api/calendar/microsoft/callback` and `/api/email/microsoft/callback`.
3. Configure read-only Graph scopes: `Calendars.Read`, `Mail.Read`, `User.Read`, `offline_access`.
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_REDIRECT_URI`.
5. Set dedicated mail values: `MICROSOFT_MAIL_CLIENT_ID`, `MICROSOFT_MAIL_CLIENT_SECRET`, `MICROSOFT_MAIL_TENANT_ID`, `MICROSOFT_MAIL_REDIRECT_URI`.

## WhatsApp Business Cloud API

Fase 1 (default): messaggi in entrata → analisi AI → bozze in Dashboard → approvazione in dry-run (nessun invio reale).

Fase 2: invio reale solo con `EXECUTION_DRY_RUN=false`, `ENABLE_WHATSAPP_EXECUTION=true` e numeri tester Meta.

### 1. Meta Developer Console

1. Vai su [developers.facebook.com](https://developers.facebook.com) → **My Apps** → crea o seleziona un'app.
2. Aggiungi il prodotto **WhatsApp** → **Set up**.
3. In **WhatsApp → API Setup** annota:
   - **Phone number ID** (non confonderlo con il numero visualizzato)
   - **WhatsApp Business Account ID**
   - **Temporary access token** (per test) oppure crea un **System User** con token permanente in produzione
4. In **App settings → Basic** copia **App ID** e **App Secret** (`WHATSAPP_APP_SECRET`, usato per validare `X-Hub-Signature-256` in POST).

### 2. Webhook (HTTPS obbligatorio)

Meta non accetta `localhost`. Per sviluppo locale usa un tunnel (ngrok, Cloudflare Tunnel, ecc.):

```bash
ngrok http 3000
# Callback URL: https://TUO-SUBDOMINIO.ngrok-free.app/api/whatsapp/webhook
```

In **WhatsApp → Configuration → Webhook**:

| Campo | Valore |
|-------|--------|
| Callback URL | `https://TUO-DOMINIO/api/whatsapp/webhook` |
| Verify token | stessa stringa di `WHATSAPP_VERIFY_TOKEN` in `.env.local` |

Sottoscrivi almeno: **messages** (campo `messages`).

Verifica locale (senza Meta):

```bash
curl "http://127.0.0.1:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=IL_TUO_TOKEN&hub.challenge=12345"
# Risposta attesa: 12345
```

Oppure: `./scripts/verify-real-setup.sh http://127.0.0.1:3000`

### 3. Variabili `.env.local` (apps/web)

```env
WHATSAPP_CLOUD_API_VERSION=v23.0
WHATSAPP_APP_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=          # stringa scelta da te, uguale a Meta webhook
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=          # token da API Setup o System User
WHATSAPP_TOKEN_ENCRYPTION_KEY=    # openssl rand -base64 32
```

In dev, se `WHATSAPP_APP_SECRET` manca, la firma POST viene saltata (warning in log). In produzione è obbligatoria.

### 4. Collegamento org in Soreya

1. Avvia web: `npm run dev:web` su `http://127.0.0.1:3000`
2. **Impostazioni → WhatsApp** → compila Phone Number ID, Business Account ID, token
3. Il **Phone Number ID** deve coincidere con quello che Meta invia in `metadata.phone_number_id` nel webhook
4. Salva: il token viene cifrato; aggiornamenti successivi possono lasciare il campo token vuoto

### 5. Test end-to-end (Fase 1)

1. Aggiungi il tuo numero personale come **tester** in Meta (WhatsApp → API Setup → Send messages).
2. Invia un messaggio di appuntamento al numero WA business (es. *"Buongiorno, vorrei un appuntamento martedì alle 10"*).
3. Controlla risposta webhook (log server o risposta JSON con `receivedMessages`, `suggestedActions`).
4. **Dashboard → Inbox** e **Approvazioni**: bozze `send_whatsapp_reply` / `ask_whatsapp_more_info`.
5. Approva → **EXECUTE** con `EXECUTION_DRY_RUN=true`: registrazione dry-run, nessun messaggio inviato.

### 6. Produzione

1. Token permanente (System User), App Secret configurato, webhook su dominio Vercel.
2. `SUPABASE_SERVICE_ROLE_KEY` obbligatoria per il webhook (insert via service role).
3. Applica migration `20260615080000_incoming_messages_upsert_constraint.sql` se non già fatto (`npm run setup:supabase`).
4. Mantieni dry-run fino a smoke test completati.

## Telegram Bot API

Fase 1 (default): messaggi in entrata → analisi AI → bozze in Dashboard → approvazione in dry-run (nessun invio reale).

### 1. Crea il bot

1. Apri Telegram e cerca **@BotFather**.
2. Invia `/newbot` e segui le istruzioni per nome e username.
3. Copia il **token HTTP API** del bot (es. `123456:ABC-DEF...`).

### 2. Variabili ambiente (web)

```env
TELEGRAM_WEBHOOK_SECRET=stringa-lunga-random
TELEGRAM_BOT_TOKEN_ENCRYPTION_KEY=chiave-lunga-random
ENABLE_TELEGRAM_EXECUTION=false
EXECUTION_DRY_RUN=true
```

`TELEGRAM_WEBHOOK_SECRET` è il fallback globale; ogni organizzazione riceve anche un secret dedicato alla connessione.

### 3. Webhook

Callback URL da configurare (automatico al salvataggio in Impostazioni):

```
https://TUO-DOMINIO/api/telegram/webhook
```

Telegram invia l'header `X-Telegram-Bot-Api-Secret-Token` con il secret impostato via `setWebhook`.

Per sviluppo locale usa ngrok o simile e imposta `TELEGRAM_WEBHOOK_BASE_URL` se l'origin rilevata non è pubblica.

### 4. Collegamento in Soreya

1. **Impostazioni → Telegram Bot** → incolla il token bot.
2. Abilita il canale e salva: Soreya chiama `getMe`, cifra il token, registra il webhook.
3. Annota il **webhook secret** mostrato dopo il salvataggio (deve coincidere con quello inviato da Telegram).

### 5. Test end-to-end (Fase 1)

1. Invia un messaggio di appuntamento al bot (es. *"Buongiorno, vorrei un appuntamento martedì alle 10"*).
2. Controlla risposta webhook (`receivedMessages`, `suggestedActions`).
3. **Dashboard → Inbox** e **Approvazioni**: bozze `send_telegram_reply` / `ask_telegram_more_info`.
4. Approva → **EXECUTE** con `EXECUTION_DRY_RUN=true`: registrazione dry-run, nessun messaggio inviato.
5. Per invio reale: `ENABLE_TELEGRAM_EXECUTION=true` e `EXECUTION_DRY_RUN=false` solo dopo smoke test.

### 6. Produzione

1. `SUPABASE_SERVICE_ROLE_KEY` obbligatoria per il webhook (insert via service role).
2. Applica migration `20260617100000_telegram_bot.sql` (`npm run setup:supabase`).
3. Mantieni dry-run fino a smoke test completati.

## Expo Push Notifications

1. Configure the Expo project and EAS project ID.
2. Set mobile `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true` when ready to request permissions.
3. Set web `ENABLE_PUSH_NOTIFICATIONS=true` and `EXPO_ACCESS_TOKEN` only when server-side delivery should be active.
4. Confirm notifications are informational only and do not execute actions.

## Vercel Deployment

1. Add all web env values to the Vercel project.
2. Use separate env values for preview and production.
3. Confirm OAuth redirect URLs include the deployed domains.
4. Check `/api/health` after deploy.
5. Keep execution dry-run enabled for the first production smoke tests.

## Cron And Scheduler

1. Set `SYNC_SECRET` to a long random value.
2. Configure cron to call `POST /api/sync/run` with header `x-sync-secret`.
3. Set `ENABLE_SCHEDULED_SYNC=true` only after manual sync works.
4. Tune `SYNC_LOOKBACK_DAYS`, `SYNC_LOOKAHEAD_DAYS`, `SYNC_EMAIL_LIMIT` and `SYNC_CALENDAR_LIMIT`.
5. Monitor sync logs and token refresh results.
