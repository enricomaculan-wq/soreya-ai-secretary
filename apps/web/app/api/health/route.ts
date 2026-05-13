import {
  WEB_SUPABASE_ENV,
  getEnvPresence,
  getMissingEnvByProvider,
  getProviderStatus,
  getSafetyStatus,
} from "@/lib/server/provider-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = getProviderStatus();
  const safety = getSafetyStatus();

  return Response.json({
    app: "Soreya",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    supabase: {
      configured: providers.supabase.configured,
      env: getEnvPresence(WEB_SUPABASE_ENV),
    },
    openaiConfigured: providers.openai.configured,
    googleCalendarConfigured: providers.googleCalendar.configured,
    gmailConfigured: providers.gmail.configured,
    microsoftCalendarConfigured: providers.microsoftCalendar.configured,
    microsoftMailConfigured: providers.microsoftMail.configured,
    whatsappConfigured: providers.whatsapp.configured,
    notificationsConfigured: providers.notifications.configured,
    syncSchedulerConfigured: providers.syncScheduler.configured,
    missingEnvByProvider: getMissingEnvByProvider(),
    execution: {
      dryRun: safety.dryRun,
      dryRunEnv: safety.dryRunEnv,
      providers: {
        email: safety.providers.email ? "enabled" : "disabled",
        whatsapp: safety.providers.whatsapp ? "enabled" : "disabled",
        calendar: safety.providers.calendar ? "enabled" : "disabled",
      },
    },
  });
}
