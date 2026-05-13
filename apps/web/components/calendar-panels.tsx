"use client";

import {
  getCalendarConnectionStatuses,
  getCachedCalendarEvents,
  getCurrentUser,
  getUserOrganization,
} from "@soreya/database";
import type { CalendarConnectionStatus, NormalizedCalendarEvent } from "@soreya/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getWebDemoData, shouldUseWebDemoData } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase";
import { syncSupabaseSessionToServer } from "@/lib/session";

type CalendarProvider = "google" | "microsoft";

const PROVIDERS: Array<{
  provider: CalendarProvider;
  title: string;
  descriptionKey: string;
  connectHref: string;
  syncHref: string;
}> = [
  {
    provider: "google",
    title: "Google Calendar",
    descriptionKey: "calendar.googleDescription",
    connectHref: "/api/calendar/google/start",
    syncHref: "/api/calendar/google/sync",
  },
  {
    provider: "microsoft",
    title: "Microsoft Outlook Calendar",
    descriptionKey: "calendar.microsoftDescription",
    connectHref: "/api/calendar/microsoft/start",
    syncHref: "/api/calendar/microsoft/sync",
  },
];

export function ConnectedCalendarsPanel() {
  const { locale, t, label } = useI18n();
  const [statuses, setStatuses] = useState<CalendarConnectionStatus[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<CalendarProvider | null>(null);

  const loadStatuses = useCallback(async () => {
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setStatuses(getWebDemoData(locale).calendarStatuses);
      setMessage(t("demo.description"));
      setIsLoading(false);
      return;
    }

    if (!hasSupabaseBrowserConfig()) {
      setStatuses([]);
      setMessage("Supabase is not configured. Calendar connection status is unavailable.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const user = await getCurrentUser(supabase);

      if (!user) {
        setStatuses([]);
        setMessage("Sign in to manage connected calendars.");
        return;
      }

      const userOrganization = await getUserOrganization(supabase, user.id);
      const { data: sessionData } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(sessionData.session);

      if (!userOrganization) {
        setStatuses([]);
        setMessage("Create an organization before connecting calendars.");
        return;
      }

      const rows = await getCalendarConnectionStatuses(supabase, userOrganization.organization.id);
      setStatuses(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load calendar connections.");
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void Promise.resolve().then(loadStatuses);
  }, [loadStatuses]);

  async function syncNow(provider: CalendarProvider, syncHref: string) {
    setSyncingProvider(provider);
    setMessage(null);

    if (shouldUseWebDemoData()) {
      setMessage(t("calendar.demoSync"));
      setSyncingProvider(null);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      await syncSupabaseSessionToServer(data.session);

      const response = await fetch(syncHref, { method: "POST" });
      const payload = (await response.json()) as { error?: string; count?: number };

      if (!response.ok) {
        throw new Error(payload.error ?? "Calendar sync failed.");
      }

      setMessage(`Synced ${payload.count ?? 0} ${provider} calendar events.`);
      await loadStatuses();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Calendar sync failed.");
    } finally {
      setSyncingProvider(null);
    }
  }

  return (
    <div className="space-y-4">
      {PROVIDERS.map((provider) => {
        const status = statuses.find((candidate) => candidate.provider === provider.provider);
        const connected = Boolean(status?.connected);
        const demoMode = shouldUseWebDemoData();

        return (
          <div key={provider.provider} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-normal text-stone-950">{provider.provider === "google" ? "Google Calendar" : "Microsoft Outlook Calendar"}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-500">{t(provider.descriptionKey)}</p>
                <div className="mt-3 space-y-1 text-sm text-stone-600">
                  <p>{t("common.status")}: {isLoading ? t("common.loading") : label("syncStatus", status?.status ?? "none") || t("common.notConnected")}</p>
                  <p>Email: {status?.email ?? t("common.notConnected")}</p>
                  <p>{t("sync.title")}: {status?.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : "-"}</p>
                  <p>{t("common.status")}: {label("syncStatus", status?.lastSyncStatus ?? "none")}</p>
                  {status?.lastSyncError ? <p className="text-rose-700">{t("sync.lastError")}: {status.lastSyncError}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {demoMode ? (
                  <button
                    className="rounded-md border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-500"
                    disabled
                    type="button"
                  >
                    {t("demo.badge")}
                  </button>
                ) : (
                  <a
                    className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
                    href={provider.connectHref}
                  >
                    {t("common.connect")}
                  </a>
                )}
                <button
                  className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  disabled={!connected || syncingProvider === provider.provider}
                  onClick={() => syncNow(provider.provider, provider.syncHref)}
                  type="button"
                >
                  {syncingProvider === provider.provider ? `${t("common.loading")}...` : t("calendar.syncNow")}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {message ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      ) : null}
    </div>
  );
}

export function CalendarEventsPanel() {
  const { locale, t, label } = useI18n();
  const [events, setEvents] = useState<NormalizedCalendarEvent[]>([]);
  const [statuses, setStatuses] = useState<CalendarConnectionStatus[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      if (shouldUseWebDemoData()) {
        const demo = getWebDemoData(locale);
        setStatuses(demo.calendarStatuses);
        setEvents(demo.calendarEvents);
        setMessage(t("demo.description"));
        setIsLoading(false);
        return;
      }

      if (!hasSupabaseBrowserConfig()) {
        setMessage("Supabase is not configured. Calendar cache is unavailable.");
        setIsLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const user = await getCurrentUser(supabase);

        if (!user) {
          setMessage("Sign in to view cached calendar events.");
          setIsLoading(false);
          return;
        }

        const userOrganization = await getUserOrganization(supabase, user.id);

        if (!userOrganization) {
          setMessage("Create an organization before syncing calendar events.");
          setIsLoading(false);
          return;
        }

        const [connectionRows, eventRows] = await Promise.all([
          getCalendarConnectionStatuses(supabase, userOrganization.organization.id),
          getCachedCalendarEvents(supabase, userOrganization.organization.id, range.start, range.end),
        ]);

        if (isMounted) {
          setStatuses(connectionRows);
          setEvents(eventRows);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load cached calendar events.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [locale, range.end, range.start, t]);

  const hasConnectedCalendar = statuses.some((status) => status.connected);

  if (isLoading) {
    return <EmptyCalendarState title={`${t("common.loading")} ${t("calendar.cachedEvents").toLowerCase()}`} detail={t("calendar.nextSevenDays")} />;
  }

  if (message && !shouldUseWebDemoData()) {
    return <EmptyCalendarState title={t("common.unavailable")} detail={message} />;
  }

  if (!hasConnectedCalendar) {
    return (
      <EmptyCalendarState
        ctaHref="#settings"
        ctaLabel={t("empty.calendar.cta")}
        detail={t("empty.calendar.missing")}
        next={t("empty.calendar.next")}
        title={t("empty.calendar.title")}
        why={t("empty.calendar.why")}
      />
    );
  }

  if (events.length === 0) {
    return (
      <EmptyCalendarState
        title={t("calendar.noCachedEvents")}
        detail={t("calendar.readOnlyCache")}
        next={t("calendar.syncNow")}
      />
    );
  }

  return (
    <div className="mt-5 divide-y divide-stone-200 border-t border-stone-200">
      {message ? <p className="py-4 text-sm text-stone-600">{message}</p> : null}
      {events.map((event) => (
        <div key={`${event.provider}-${event.providerEventId}`} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)_120px]">
          <div className="text-sm text-stone-500">{formatDateTime(event.startsAt)}</div>
          <div>
            <p className="text-sm font-medium text-stone-950">{event.title}</p>
            <p className="mt-1 text-sm text-stone-500">{event.location ?? t("common.none")}</p>
          </div>
          <div className="text-sm font-medium capitalize text-stone-700">{label("providers", event.provider)}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyCalendarState({
  ctaHref,
  ctaLabel,
  detail,
  next,
  title,
  why,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  detail: string;
  next?: string;
  title: string;
  why?: string;
}) {
  return (
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-5">
      <p className="text-sm font-medium text-stone-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
      {why ? <p className="mt-3 text-sm leading-6 text-stone-600">{why}</p> : null}
      {next ? <p className="mt-2 text-sm leading-6 text-stone-600">{next}</p> : null}
      {ctaHref && ctaLabel ? (
        <a className="mt-4 inline-flex rounded-md bg-stone-950 px-3 py-2 text-sm font-medium text-white" href={ctaHref}>
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
