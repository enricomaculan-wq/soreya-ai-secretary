import { generateDailySummaryForOrganization } from "@/lib/server/daily-summary";
import { jsonError } from "@/lib/server/email-api";
import { syncGmail, syncGoogleCalendar, syncMicrosoftCalendar, syncMicrosoftMail } from "@/lib/server/provider-sync";
import { checkRateLimitAsync, rateLimitResponse } from "@/lib/server/rate-limit";
import {
  createIntegrationServerSupabaseClient,
  createServerSupabaseClient,
  getAuthenticatedServerContext,
} from "@/lib/server/supabase";
import { refreshOrganizationTokens } from "@/lib/server/token-refresh";
import { z } from "zod";

type SyncRunBody = {
  organizationId?: string;
  providers?: Array<"google_calendar" | "microsoft_calendar" | "gmail" | "microsoft_mail">;
  jobType?: "calendar_sync" | "email_sync" | "full_sync" | "daily_summary_generate";
};

const syncRunSchema = z.object({
  organizationId: z.string().uuid().optional(),
  providers: z.array(z.enum(["google_calendar", "microsoft_calendar", "gmail", "microsoft_mail"])).max(4).optional(),
  jobType: z.enum(["calendar_sync", "email_sync", "full_sync", "daily_summary_generate"]).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimitAsync(request, { route: "/api/sync/run", limit: 20 });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const body = await readBody(request);
    const cronSecret = request.headers.get("x-sync-secret");
    const isCron = Boolean(cronSecret);
    const configuredSecret = process.env.SYNC_SECRET;

    if (isCron) {
      if (!configuredSecret || cronSecret !== configuredSecret) {
        return Response.json({ error: "Invalid sync secret." }, { status: 401 });
      }

      if (process.env.ENABLE_SCHEDULED_SYNC !== "true") {
        return Response.json({ disabled: true, message: "Scheduled sync is disabled by ENABLE_SCHEDULED_SYNC=false." });
      }

      if (!body.organizationId) {
        return Response.json({ error: "organizationId is required for cron sync." }, { status: 400 });
      }

      const supabase = createIntegrationServerSupabaseClient();
      const report = await runSyncPlan(supabase, {
        organizationId: body.organizationId,
        timezone: "Europe/Rome",
        userId: null,
        providers: body.providers,
        jobType: body.jobType ?? "full_sync",
        includeDailySummary: false,
      });

      return Response.json(report);
    }

    const context = await getAuthenticatedServerContext();
    const report = await runSyncPlan(context.supabase, {
      organizationId: context.userOrganization.organization.id,
      timezone: context.userOrganization.organization.default_timezone,
      userId: context.user.id,
      providers: body.providers,
      jobType: body.jobType ?? "full_sync",
      includeDailySummary: body.jobType === "daily_summary_generate",
    });

    return Response.json(report);
  } catch (error) {
    return jsonError(error, 400);
  }
}

async function runSyncPlan(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  input: {
    organizationId: string;
    timezone: string;
    userId: string | null;
    providers?: SyncRunBody["providers"];
    jobType: NonNullable<SyncRunBody["jobType"]>;
    includeDailySummary: boolean;
  },
) {
  const providers = new Set(input.providers ?? ["google_calendar", "microsoft_calendar", "gmail", "microsoft_mail"]);
  const results: unknown[] = [];
  const tokenRefresh = await refreshOrganizationTokens(supabase, input.organizationId);

  if (input.jobType === "calendar_sync" || input.jobType === "full_sync") {
    if (providers.has("google_calendar")) {
      results.push(await safeRun(() => syncGoogleCalendar(supabase, input.organizationId)));
    }

    if (providers.has("microsoft_calendar")) {
      results.push(await safeRun(() => syncMicrosoftCalendar(supabase, input.organizationId)));
    }
  }

  if (input.jobType === "email_sync" || input.jobType === "full_sync") {
    if (providers.has("gmail")) {
      results.push(await safeRun(() => syncGmail(supabase, input.organizationId, input.timezone)));
    }

    if (providers.has("microsoft_mail")) {
      results.push(await safeRun(() => syncMicrosoftMail(supabase, input.organizationId, input.timezone)));
    }
  }

  if (input.includeDailySummary && input.userId) {
    const summary = await generateDailySummaryForOrganization(supabase, {
      organizationId: input.organizationId,
      userId: input.userId,
      defaultTimezone: input.timezone,
    });
    results.push({ provider: "daily_summary", summaryId: summary.id });
  }

  return {
    organizationId: input.organizationId,
    jobType: input.jobType,
    tokenRefresh,
    results,
    readOnly: true,
    message: "Sync reads messages and calendars only. It does not send or modify anything.",
  };
}

async function safeRun(run: () => Promise<unknown>) {
  try {
    return await run();
  } catch (error) {
    return {
      failed: true,
      error: error instanceof Error ? error.message : "Sync failed.",
    };
  }
}

async function readBody(request: Request): Promise<SyncRunBody> {
  const body = await request.json().catch(() => ({}));

  return syncRunSchema.parse(body);
}
