import type { DailySummary } from '@soreya/shared';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { fetchWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

type SummaryResponse = {
  summary?: DailySummary;
};

export default function DailySummaryScreen() {
  const { locale, t } = useI18n();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    if (shouldUseMobileDemoData()) {
      setSummary(getMobileDemoData(locale).dailySummary);
      setMessage(t('demo.description'));
      setIsLoading(false);
      return;
    }

    if (!shouldUseMobileWebApi()) {
      setSummary(null);
      setMessage(t('mobile.errors.webAppUrlMissing'));
      setIsLoading(false);
      return;
    }

    try {
      const payload = await fetchWebApi<SummaryResponse>('/api/daily-summary/today');
      setSummary(payload.summary ?? null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <SoreyaScreen eyebrow={t('dailySummary.title')} title={t('navigation.dailySummary')}>
      {message ? (
        <Section title={t('common.status')}>
          <DataRow title={t('navigation.dailySummary')} detail={message} badge={t('common.info')} />
        </Section>
      ) : null}

      {isLoading ? (
        <Section title={t('common.loading')}>
          <DataRow title={t('dailySummary.title')} detail={t('common.loading')} badge="…" />
        </Section>
      ) : summary ? (
        <>
          <Section title={summary.title}>
            <Text style={styles.headline}>{summary.headline}</Text>
            <Text style={styles.meta}>
              {summary.summaryDate} · {summary.timezone} · {summary.status}
            </Text>
          </Section>

          <Section title={t('dashboard.pendingApprovals')}>
            <View style={styles.metrics}>
              <Metric label={t('dailySummary.appointments')} value={String(summary.totalAppointments)} />
              <Metric label={t('dailySummary.approvals')} value={String(summary.pendingApprovalsCount)} />
              <Metric label={t('dailySummary.messages')} value={String(summary.unhandledMessagesCount)} />
              <Metric label={t('dailySummary.conflicts')} value={String(summary.conflictsCount)} />
            </View>
          </Section>

          <Section title={t('dailySummary.title')}>
            {[...summary.items, ...summary.recommendations].slice(0, 8).map((item) => (
              <DataRow
                key={item.id}
                title={item.title}
                detail={item.description ?? item.type}
                badge={item.priority}
              />
            ))}
          </Section>
        </>
      ) : (
        <Section title={t('empty.dailySummary.title')}>
          <DataRow title={t('empty.dailySummary.missing')} detail={t('empty.dailySummary.next')} badge={t('common.missing')} />
        </Section>
      )}

      <StatusBadge label={t('safety.approvalFirst')} tone="success" />
    </SoreyaScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    color: '#171717',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  meta: {
    color: '#737373',
    fontSize: 13,
    marginTop: 6,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    minWidth: '46%',
    padding: 12,
  },
  metricLabel: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#171717',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
});
