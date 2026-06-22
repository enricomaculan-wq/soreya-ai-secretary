# Soreya Mobile

Expo React Native app for Soreya approvals, emergency controls, calendar review and quick call notes.

## Commands

```bash
npm run start --workspace apps/mobile
npm run lint --workspace apps/mobile
```

## Environment

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_WEB_APP_URL=http://localhost:3000
EXPO_PUBLIC_USE_DEMO_DATA=false
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

When `EXPO_PUBLIC_WEB_APP_URL` is set, approvals, emergency, quick call and daily summary use the same Next.js API routes as the web app (Bearer auth). Inbox still uses shared demo data until a dedicated mobile inbox API exists.
