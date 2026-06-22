# Test reale — percorso minimo (analisi codice)

Documento aggiornato al codice attuale (Roadmap A, Google-only per email/calendario).

## Cosa funziona oggi

| Step | Flusso | Dove finisce |
|------|--------|--------------|
| Login + org | Supabase Auth + onboarding | DB `organizations`, `organization_members` |
| Brain / listino | Impostazioni → Brain | DB `organization_brain`, `organization_services` |
| Calendar read + write | OAuth Google → sync → approva → EXECUTE | `calendar-execution.ts` |
| Gmail read + send | OAuth Gmail → sync → approva → EXECUTE | `email-execution.ts` |
| WA inbound + send | Webhook Meta → analisi → approva → EXECUTE | `whatsapp-execution.ts` |
| Form / chat sito | API pubbliche → analisi → approva | `website-form-ingest`, `website-chat-ingest` |
| Telegram | Webhook Bot API → analisi → approva → EXECUTE | `telegram-execution.ts` |
| Approvazioni | Dashboard → ApprovalEnginePanel | API `/api/approvals/*` |
| Inbox | Dashboard → InboxPanel | API `/api/inbox/messages` |
| Esecuzione | **Dry-run default** | `EXECUTION_DRY_RUN=true` |

## Demo vs reale — differenza critica

### `/app` (demo playground)
- Chiama solo `/api/demo/analyze-request`
- Salva bozze in **localStorage**
- **Non scrive** su Supabase
- Attivo se `NEXT_PUBLIC_USE_DEMO_DATA=true` **oppure** Supabase browser non configurato

### `/dashboard` + `/settings` (reale)
- Richiedono **login** (middleware + cookie `soreya-sb-access-token`)
- Approvazioni da `/api/approvals/list` (Supabase)
- Inbox da `/api/inbox/messages`
- Sync da `/api/sync/run`
- Attivo quando Supabase è configurato **e** `NEXT_PUBLIC_USE_DEMO_DATA=false`

**Regola pratica:** per il test reale ignora `/app` come fonte di verità. Usa Dashboard e Impostazioni.

## Esecuzione dopo approvazione

| Azione | Stato codice | Flag richiesti |
|--------|--------------|----------------|
| Invio Gmail | Implementato (Google only) | `ENABLE_EMAIL_EXECUTION=true`, `EXECUTION_DRY_RUN=false` |
| Scrittura calendario Google | Implementato (`calendar_create`) | `ENABLE_CALENDAR_EXECUTION=true`, `EXECUTION_DRY_RUN=false` |
| Invio WhatsApp | Implementato | `ENABLE_WHATSAPP_EXECUTION=true`, `EXECUTION_DRY_RUN=false` |
| Invio Telegram | Implementato | `ENABLE_TELEGRAM_EXECUTION=true`, `EXECUTION_DRY_RUN=false` |

OAuth Google (riconnessione necessaria dopo aggiornamento scope):
- Calendar: `calendar.events.readonly` + `calendar.events`
- Gmail: `gmail.readonly` + `gmail.send`

## Percorso minimo consigliato

```
1. Supabase + migration (`npm run setup:supabase`) + .env base
2. NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 (usa sempre lo stesso host)
3. NEXT_PUBLIC_USE_DEMO_DATA=false
4. Login → onboarding + Brain
5. Google Calendar OAuth + sync manuale
6. Gmail OAuth + sync manuale
7. Verifica: email appuntamento → sync → bozza in Dashboard
8. Approva in dry-run (nessun invio)
9. [Opzionale] Form/chat sito in Impostazioni + messaggio di prova
10. [Opzionale] WA/Telegram con URL HTTPS pubblico
11. [Dopo smoke OK] Abilita flag execution per invio reale
```

## Verifiche automatiche

```bash
./scripts/verify-real-setup.sh
npm run verify:supabase
curl http://127.0.0.1:3000/api/health | jq .
```

## Migration Supabase

Usa lo script (consigliato):

```bash
npm run setup:supabase
```

Oppure applica in ordine tutti i file in `supabase/migrations/` (19 file al momento, inclusi form/chat/Telegram).
