import type { ProviderStatus, ProviderStatusState } from "@/lib/server/provider-status";
import { getProviderStatus } from "@/lib/server/provider-status";
import { getDictionary, t as translate, type Dictionary } from "@soreya/shared";
import { cookies } from "next/headers";

const STATUS_CLASSES: Record<ProviderStatusState, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  missing_env: "border-amber-200 bg-amber-50 text-amber-700",
  disabled: "border-stone-200 bg-stone-100 text-stone-600",
  dry_run: "border-sky-200 bg-sky-50 text-sky-700",
};

export async function SystemStatusPanel() {
  const cookieStore = await cookies();
  const dictionary = getDictionary(cookieStore.get("soreya_locale")?.value);
  const status = getProviderStatus();
  const rows: ProviderStatus[] = [
    status.supabase,
    status.openai,
    status.googleCalendar,
    status.gmail,
    status.microsoftCalendar,
    status.microsoftMail,
    status.whatsapp,
    status.whatsappSignature,
    status.notifications,
    status.signedActionTokens,
    status.rateLimit,
    status.syncScheduler,
    status.execution,
  ];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-normal text-stone-950">{translate(dictionary, "systemStatus.title")}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-500">
            {translate(dictionary, "systemStatus.description")}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          {translate(dictionary, "systemStatus.approvalFirst")}
        </span>
      </div>

      <div className="mt-5 divide-y divide-stone-100 border-t border-stone-100">
        {rows.map((row) => (
          <div key={row.key} className="grid gap-3 py-4 sm:grid-cols-[190px_120px_minmax(0,1fr)] sm:items-start">
            <p className="text-sm font-medium text-stone-950">{row.label}</p>
            <StatusBadge dictionary={dictionary} status={row.status} />
            <div className="text-sm leading-6 text-stone-600">
              <p>{statusDetail(row, dictionary)}</p>
              {row.missingEnv.length > 0 ? (
                <p className="mt-1 break-words text-xs text-amber-700">
                  <span className="font-medium">{translate(dictionary, "systemStatus.missingEnv")}:</span>{" "}
                  <span className="font-mono">{row.missingEnv.join(", ")}</span>
                </p>
              ) : null}
              {row.details.map((detail) => (
                <p key={detail} className="mt-1 text-xs text-stone-500">
                  {localizeProviderDetail(detail, dictionary)}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ dictionary, status }: { dictionary: Dictionary; status: ProviderStatusState }) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
      {statusLabel(status, dictionary)}
    </span>
  );
}

function statusLabel(status: ProviderStatusState, dictionary: Dictionary) {
  if (status === "ready") {
    return translate(dictionary, "systemStatus.ready");
  }

  if (status === "missing_env") {
    return translate(dictionary, "systemStatus.missingEnv");
  }

  if (status === "disabled") {
    return translate(dictionary, "systemStatus.disabled");
  }

  return translate(dictionary, "systemStatus.dryRun");
}

function statusDetail(status: ProviderStatus, dictionary: Dictionary) {
  if (status.status === "ready") {
    return translate(dictionary, "systemStatus.configured");
  }

  if (status.status === "dry_run") {
    return translate(dictionary, "systemStatus.dryRunDescription");
  }

  if (status.status === "disabled") {
    return translate(dictionary, "systemStatus.disabledDescription");
  }

  return translate(dictionary, "systemStatus.requiredEnvironmentVariablesMissing");
}

function localizeProviderDetail(detail: string, dictionary: Dictionary) {
  if (detail.includes("server-only")) {
    return `SUPABASE_SERVICE_ROLE_KEY: ${translate(dictionary, "systemStatus.serverOnlySecret")}`;
  }

  if (detail.includes("OPENAI_MODEL defaults")) {
    return `OPENAI_MODEL: ${translate(dictionary, "systemStatus.productionSafety")}`;
  }

  if (detail.includes("OAuth scope is read-only")) {
    return translate(dictionary, "systemStatus.oauthReadOnlyScope");
  }

  if (detail.startsWith("Dedicated ")) {
    return translate(dictionary, "systemStatus.dedicatedEnvPreferred");
  }

  if (detail.includes("Webhook GET verifies") || detail.includes("signature validation")) {
    return translate(dictionary, "systemStatus.productionSafety");
  }

  if (detail.includes("Push delivery is disabled")) {
    return translate(dictionary, "systemStatus.pushDeliveryDisabled");
  }

  if (detail.includes("Push notifications only alert")) {
    return translate(dictionary, "systemStatus.notificationsDoNotExecute");
  }

  if (detail.startsWith("Token TTL:")) {
    return `${translate(dictionary, "systemStatus.tokenTtl")}: ${detail.replace("Token TTL:", "").trim()}`;
  }

  if (detail.includes("Notification quick actions")) {
    return translate(dictionary, "systemStatus.signedActionTokenRequired");
  }

  if (detail.includes("Rate limiting is disabled")) {
    return translate(dictionary, "systemStatus.rateLimitDisabled");
  }

  if (detail.includes("In-memory best-effort")) {
    return translate(dictionary, "systemStatus.rateLimitEnabled");
  }

  if (detail.includes("Scheduled sync is disabled")) {
    return translate(dictionary, "systemStatus.syncDisabled");
  }

  if (detail.includes("Sync is read-only")) {
    return translate(dictionary, "systemStatus.syncReadOnly");
  }

  if (detail.includes("Dry-run is enabled")) {
    return translate(dictionary, "systemStatus.executionDryRunEnabled");
  }

  if (detail.includes("Dry-run is disabled")) {
    return translate(dictionary, "systemStatus.executionDryRunDisabled");
  }

  const executionFlag = /^(Email|WhatsApp|Calendar) execution: (enabled|disabled)\.$/.exec(detail);
  if (executionFlag) {
    const [, provider, state] = executionFlag;
    const providerKey =
      provider === "Email"
        ? "systemStatus.emailExecution"
        : provider === "WhatsApp"
          ? "systemStatus.whatsappExecution"
          : "systemStatus.calendarExecution";
    const stateKey = state === "enabled" ? "systemStatus.enabled" : "systemStatus.disabledLower";
    return `${translate(dictionary, providerKey)}: ${translate(dictionary, stateKey)}.`;
  }

  return detail;
}
