import { buildDailySummary } from "@soreya/ai";
import {
  createDailySummary,
  getDailySummarySettings,
  getTodayAppointmentRequests,
  getTodayCalendarEvents,
  getTodayPendingApprovals,
  getTodayUnhandledMessages,
  upsertDailySummarySettings,
  type SoreyaSupabaseClient,
} from "@soreya/database";
import type { DailySummarySettings, UserRule } from "@soreya/shared";

export async function generateDailySummaryForOrganization(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    defaultTimezone: string;
  },
) {
  const settings = await ensureDailySummarySettings(supabase, input);
  const summaryDate = dateKeyForTimezone(settings.timezone);
  const [events, appointmentRequests, pendingApprovals, unhandledMessages, userRules] = await Promise.all([
    settings.includeCalendar ? getTodayCalendarEvents(supabase, input.organizationId, settings.timezone) : Promise.resolve([]),
    getTodayAppointmentRequests(supabase, input.organizationId),
    settings.includePendingApprovals ? getTodayPendingApprovals(supabase, input.organizationId) : Promise.resolve([]),
    settings.includeUnhandledMessages ? getTodayUnhandledMessages(supabase, input.organizationId) : Promise.resolve([]),
    getActiveUserRules(supabase, input.organizationId),
  ]);
  const draft = buildDailySummary({
    organizationId: input.organizationId,
    summaryDate,
    timezone: settings.timezone,
    events,
    appointmentRequests,
    pendingApprovals,
    unhandledMessages,
    userRules,
    includeCalendar: settings.includeCalendar,
    includePendingApprovals: settings.includePendingApprovals,
    includeUnhandledMessages: settings.includeUnhandledMessages,
    includeFreeSlots: settings.includeFreeSlots,
  });

  return createDailySummary(supabase, draft);
}

export async function ensureDailySummarySettings(
  supabase: SoreyaSupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    defaultTimezone: string;
  },
): Promise<DailySummarySettings> {
  const existing = await getDailySummarySettings(supabase, input.organizationId);

  if (existing) {
    return existing;
  }

  return upsertDailySummarySettings(supabase, {
    organizationId: input.organizationId,
    userId: input.userId,
    timezone: input.defaultTimezone,
  });
}

export function dateKeyForTimezone(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function getActiveUserRules(
  supabase: SoreyaSupabaseClient,
  organizationId: string,
): Promise<UserRule[]> {
  const { data, error } = await supabase
    .from("user_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}
