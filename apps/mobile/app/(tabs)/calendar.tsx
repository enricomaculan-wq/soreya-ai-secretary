import { getCachedCalendarEvents, getCalendarConnectionStatuses } from '@soreya/database';
import type { CalendarConnectionStatus, NormalizedCalendarEvent } from '@soreya/shared';
import { useEffect, useMemo, useState } from 'react';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, MetricGrid, MetricTile, Section, SoreyaScreen } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';

const dayParts = ['Morning', 'Afternoon', 'Evening'] as const;

export default function CalendarScreen() {
  const { locale, t, label } = useI18n();
  const { userOrganization } = useSoreyaAuth();
  const [statuses, setStatuses] = useState<CalendarConnectionStatus[]>([]);
  const [events, setEvents] = useState<NormalizedCalendarEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);

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

    async function loadCalendarData() {
      if (shouldUseMobileDemoData()) {
        const demo = getMobileDemoData(locale);
        setStatuses(demo.calendarStatuses);
        setEvents(demo.calendarEvents);
        setMessage(t('demo.description'));
        return;
      }

      if (!hasSupabaseMobileConfig()) {
        setMessage('Supabase is not configured. Connect calendars from web dashboard after setup.');
        return;
      }

      if (!userOrganization) {
        setMessage('Create an organization from the web dashboard before syncing calendars.');
        return;
      }

      try {
        const supabase = getSupabaseMobileClient();
        const [connectionRows, eventRows] = await Promise.all([
          getCalendarConnectionStatuses(supabase, userOrganization.organization.id),
          getCachedCalendarEvents(supabase, userOrganization.organization.id, range.start, range.end),
        ]);

        if (isMounted) {
          setStatuses(connectionRows);
          setEvents(eventRows);
          setMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : 'Unable to load calendar data.');
        }
      }
    }

    loadCalendarData();

    return () => {
      isMounted = false;
    };
  }, [locale, range.end, range.start, t, userOrganization]);

  const connectedCount = statuses.filter((status) => status.connected).length;

  return (
    <SoreyaScreen eyebrow="Availability" title={t('calendar.title')}>
      <MetricGrid>
        <MetricTile label={t('calendar.cachedEvents')} value={String(events.length)} detail={t('calendar.nextSevenDays')} />
        <MetricTile label={t('calendar.conflicts')} value="0" detail={t('dashboard.needsReview')} />
      </MetricGrid>

      <Section title={t('calendar.connectedCalendars')}>
        {statuses.length > 0 ? (
          statuses.map((status) => (
            <DataRow
              key={status.provider}
              title={status.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook Calendar'}
              detail={status.email ?? t('calendar.connectFromWeb')}
              badge={status.connected ? t('common.connected') : t('common.notConnected')}
              badgeTone={status.connected ? 'success' : 'warning'}
            />
          ))
        ) : (
          <DataRow
            title={t('calendar.noConnectedCalendar')}
            detail={message ?? t('calendar.connectFromWeb')}
            badge="Web"
            badgeTone="warning"
          />
        )}
      </Section>

      {connectedCount > 0 && events.length > 0 ? (
        <Section title={t('calendar.nextSevenDays')}>
          {events.slice(0, 8).map((event) => (
            <DataRow
              key={`${event.provider}-${event.providerEventId}`}
              title={event.title}
              detail={`${formatDateTime(event.startsAt)} · ${event.provider}`}
              badge={label('approvalStatus', event.status) || event.status}
              badgeTone={event.status === 'cancelled' ? 'danger' : 'neutral'}
            />
          ))}
        </Section>
      ) : (
        <Section title={t('dashboard.eyebrow')}>
          {dayParts.map((part) => (
            <DataRow
              key={part}
              title={part}
              detail={connectedCount > 0 ? t('calendar.noCachedEvents') : t('calendar.connectFromWeb')}
              badge={t('common.open')}
              badgeTone="neutral"
            />
          ))}
        </Section>
      )}

      <Section title={t('calendar.conflicts')}>
        <DataRow
          title={t('calendar.alternativeSlots')}
          detail={t('safety.approvalFirst')}
          badge={t('common.pendingApproval')}
          badgeTone="success"
        />
      </Section>
    </SoreyaScreen>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
