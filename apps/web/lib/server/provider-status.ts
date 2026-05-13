export type ProviderStatusState = "ready" | "missing_env" | "disabled" | "dry_run";

export type ProviderStatusKey =
  | "supabase"
  | "openai"
  | "googleCalendar"
  | "gmail"
  | "microsoftCalendar"
  | "microsoftMail"
  | "whatsapp"
  | "whatsappSignature"
  | "notifications"
  | "signedActionTokens"
  | "rateLimit"
  | "syncScheduler"
  | "execution";

export type ProviderStatus = {
  key: ProviderStatusKey;
  label: string;
  configured: boolean;
  status: ProviderStatusState;
  missingEnv: string[];
  details: string[];
};

export type SafetyStatus = {
  dryRun: boolean;
  dryRunEnv: string;
  providers: {
    email: boolean;
    whatsapp: boolean;
    calendar: boolean;
  };
};

export const WEB_SUPABASE_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const PROVIDER_KEYS = [
  "supabase",
  "openai",
  "googleCalendar",
  "gmail",
  "microsoftCalendar",
  "microsoftMail",
  "whatsapp",
  "whatsappSignature",
  "notifications",
  "signedActionTokens",
  "rateLimit",
  "syncScheduler",
  "execution",
] as const satisfies readonly ProviderStatusKey[];

export function getProviderStatus(env: NodeJS.ProcessEnv = process.env): Record<ProviderStatusKey, ProviderStatus> {
  const safety = getSafetyStatus(env);
  const anyRealExecutionEnabled = safety.providers.email || safety.providers.whatsapp || safety.providers.calendar;

  return {
    supabase: buildRequiredStatus(env, "supabase", "Supabase", [...WEB_SUPABASE_ENV], [
      "SUPABASE_SERVICE_ROLE_KEY is server-only; keep it out of mobile and browser bundles.",
    ]),
    openai: buildRequiredStatus(env, "openai", "OpenAI", ["OPENAI_API_KEY", "OPENAI_MODEL"], [
      "OPENAI_MODEL defaults in code, but keeping it explicit makes production changes auditable.",
    ]),
    googleCalendar: buildRequiredStatus(
      env,
      "googleCalendar",
      "Google Calendar",
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "CALENDAR_TOKEN_ENCRYPTION_KEY"],
      ["OAuth scope is read-only in this phase."],
    ),
    gmail: buildFallbackStatus(
      env,
      "gmail",
      "Gmail",
      [
        ["GOOGLE_GMAIL_CLIENT_ID", "GOOGLE_CLIENT_ID"],
        ["GOOGLE_GMAIL_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
        ["GOOGLE_GMAIL_REDIRECT_URI"],
        ["EMAIL_TOKEN_ENCRYPTION_KEY"],
      ],
      ["Dedicated GOOGLE_GMAIL_* env vars are preferred; GOOGLE_* fallback remains supported."],
    ),
    microsoftCalendar: buildRequiredStatus(
      env,
      "microsoftCalendar",
      "Microsoft Calendar",
      ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID", "MICROSOFT_REDIRECT_URI", "CALENDAR_TOKEN_ENCRYPTION_KEY"],
      ["OAuth scope is read-only in this phase."],
    ),
    microsoftMail: buildFallbackStatus(
      env,
      "microsoftMail",
      "Microsoft Mail",
      [
        ["MICROSOFT_MAIL_CLIENT_ID", "MICROSOFT_CLIENT_ID"],
        ["MICROSOFT_MAIL_CLIENT_SECRET", "MICROSOFT_CLIENT_SECRET"],
        ["MICROSOFT_MAIL_TENANT_ID", "MICROSOFT_TENANT_ID"],
        ["MICROSOFT_MAIL_REDIRECT_URI"],
        ["EMAIL_TOKEN_ENCRYPTION_KEY"],
      ],
      ["Dedicated MICROSOFT_MAIL_* env vars are preferred; MICROSOFT_* fallback remains supported."],
    ),
    whatsapp: buildRequiredStatus(
      env,
      "whatsapp",
      "WhatsApp Business",
      [
        "WHATSAPP_CLOUD_API_VERSION",
        "WHATSAPP_APP_ID",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_VERIFY_TOKEN",
        "WHATSAPP_BUSINESS_ACCOUNT_ID",
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_TOKEN_ENCRYPTION_KEY",
      ],
      ["Webhook GET verifies WHATSAPP_VERIFY_TOKEN; POST validates X-Hub-Signature-256 when WHATSAPP_APP_SECRET is configured."],
    ),
    whatsappSignature: buildRequiredStatus(
      env,
      "whatsappSignature",
      "WhatsApp signature",
      ["WHATSAPP_APP_SECRET"],
      [
        hasEnv(env, "WHATSAPP_APP_SECRET")
          ? "WhatsApp webhook POST signature validation is configured."
          : "Development can skip signature validation, but production blocks unsigned WhatsApp POST requests.",
      ],
    ),
    notifications: buildToggleStatus(env, {
      key: "notifications",
      label: "Expo Push",
      enabledEnv: "ENABLE_PUSH_NOTIFICATIONS",
      requiredWhenEnabled: ["EXPO_ACCESS_TOKEN"],
      disabledDetail: "Push delivery is disabled by ENABLE_PUSH_NOTIFICATIONS=false.",
      readyDetail: "Push notifications only alert users; they do not approve or execute actions.",
    }),
    signedActionTokens: buildRequiredStatus(
      env,
      "signedActionTokens",
      "Signed action tokens",
      ["SIGNED_ACTION_TOKEN_SECRET"],
      [
        `Token TTL: ${env.SIGNED_ACTION_TOKEN_TTL_SECONDS ?? "default:300"} seconds.`,
        "Notification quick actions require a valid short-lived token when no web session is present.",
      ],
    ),
    rateLimit: buildToggleStatus(env, {
      key: "rateLimit",
      label: "API rate limit",
      enabledEnv: "ENABLE_RATE_LIMIT",
      requiredWhenEnabled: [],
      disabledDetail: "Rate limiting is disabled by ENABLE_RATE_LIMIT=false or missing env.",
      readyDetail: `In-memory best-effort limit enabled: ${env.RATE_LIMIT_MAX_REQUESTS ?? "60"} requests per ${env.RATE_LIMIT_WINDOW_SECONDS ?? "60"} seconds.`,
    }),
    syncScheduler: buildToggleStatus(env, {
      key: "syncScheduler",
      label: "Sync scheduler",
      enabledEnv: "ENABLE_SCHEDULED_SYNC",
      requiredWhenEnabled: [
        "SYNC_SECRET",
        "SYNC_LOOKBACK_DAYS",
        "SYNC_LOOKAHEAD_DAYS",
        "SYNC_EMAIL_LIMIT",
        "SYNC_CALENDAR_LIMIT",
      ],
      disabledDetail: "Scheduled sync is disabled by ENABLE_SCHEDULED_SYNC=false.",
      readyDetail: "Sync is read-only: it reads messages/calendars and refreshes tokens.",
    }),
    execution: {
      key: "execution",
      label: "Execution dry-run",
      configured: safety.dryRun || anyRealExecutionEnabled,
      status: safety.dryRun ? "dry_run" : anyRealExecutionEnabled ? "ready" : "disabled",
      missingEnv: missingEnv(env, [
        "EXECUTION_DRY_RUN",
        "ENABLE_EMAIL_EXECUTION",
        "ENABLE_WHATSAPP_EXECUTION",
        "ENABLE_CALENDAR_EXECUTION",
      ]),
      details: [
        safety.dryRun
          ? "Dry-run is enabled. No external email, WhatsApp message or calendar mutation is performed."
          : "Dry-run is disabled. Real adapters still return safe blocked results until final provider execution is implemented.",
        `Email execution: ${safety.providers.email ? "enabled" : "disabled"}.`,
        `WhatsApp execution: ${safety.providers.whatsapp ? "enabled" : "disabled"}.`,
        `Calendar execution: ${safety.providers.calendar ? "enabled" : "disabled"}.`,
      ],
    },
  };
}

export function getMissingEnvByProvider(env: NodeJS.ProcessEnv = process.env): Record<ProviderStatusKey, string[]> {
  const providerStatus = getProviderStatus(env);
  const result = {} as Record<ProviderStatusKey, string[]>;

  for (const key of PROVIDER_KEYS) {
    result[key] = providerStatus[key].missingEnv;
  }

  return result;
}

export function getSafetyStatus(env: NodeJS.ProcessEnv = process.env): SafetyStatus {
  return {
    dryRun: env.EXECUTION_DRY_RUN !== "false",
    dryRunEnv: env.EXECUTION_DRY_RUN ?? "default:true",
    providers: {
      email: env.ENABLE_EMAIL_EXECUTION === "true",
      whatsapp: env.ENABLE_WHATSAPP_EXECUTION === "true",
      calendar: env.ENABLE_CALENDAR_EXECUTION === "true",
    },
  };
}

export function getEnvPresence(names: readonly string[], env: NodeJS.ProcessEnv = process.env) {
  return Object.fromEntries(names.map((name) => [name, hasEnv(env, name) ? "present" : "missing"]));
}

function buildRequiredStatus(
  env: NodeJS.ProcessEnv,
  key: ProviderStatusKey,
  label: string,
  requiredEnv: string[],
  details: string[] = [],
): ProviderStatus {
  const missing = missingEnv(env, requiredEnv);

  return {
    key,
    label,
    configured: missing.length === 0,
    status: missing.length === 0 ? "ready" : "missing_env",
    missingEnv: missing,
    details,
  };
}

function buildFallbackStatus(
  env: NodeJS.ProcessEnv,
  key: ProviderStatusKey,
  label: string,
  requirements: string[][],
  details: string[] = [],
): ProviderStatus {
  const missing = requirements.flatMap((group) => {
    if (group.some((name) => hasEnv(env, name))) {
      return [];
    }

    return [group.join(" or ")];
  });

  return {
    key,
    label,
    configured: missing.length === 0,
    status: missing.length === 0 ? "ready" : "missing_env",
    missingEnv: missing,
    details,
  };
}

function buildToggleStatus(
  env: NodeJS.ProcessEnv,
  input: {
    key: ProviderStatusKey;
    label: string;
    enabledEnv: string;
    requiredWhenEnabled: string[];
    disabledDetail: string;
    readyDetail: string;
  },
): ProviderStatus {
  const enabled = env[input.enabledEnv] === "true";
  const missing = enabled ? missingEnv(env, [input.enabledEnv, ...input.requiredWhenEnabled]) : [];

  return {
    key: input.key,
    label: input.label,
    configured: enabled && missing.length === 0,
    status: enabled ? (missing.length === 0 ? "ready" : "missing_env") : "disabled",
    missingEnv: missing,
    details: [enabled ? input.readyDetail : input.disabledDetail],
  };
}

function missingEnv(env: NodeJS.ProcessEnv, names: readonly string[]): string[] {
  return names.filter((name) => !hasEnv(env, name));
}

function hasEnv(env: NodeJS.ProcessEnv, name: string): boolean {
  return Boolean(env[name]?.trim());
}
