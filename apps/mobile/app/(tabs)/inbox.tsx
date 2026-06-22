import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { buildMobileInboxItems } from '@/lib/inbox-items';
import { shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { fetchWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

type InboxApiItem = {
  kind: 'email' | 'whatsapp';
  id: string;
  title: string;
  preview: string;
  sender: string;
};

export default function InboxScreen() {
  const { locale, t } = useI18n();
  const usesDemoData = shouldUseMobileDemoData() || !shouldUseMobileWebApi();
  const demoItems = useMemo(() => buildMobileInboxItems(locale, t), [locale, t]);
  const [liveItems, setLiveItems] = useState<InboxApiItem[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInbox = useCallback(async () => {
    if (usesDemoData) {
      setLiveItems(null);
      setStatusMessage(t('mobile.inbox.demoOnly'));
      return;
    }

    setIsLoading(true);

    try {
      const payload = await fetchWebApi<{ items?: InboxApiItem[] }>('/api/inbox/messages?limit=12');
      setLiveItems(payload.items ?? []);
      setStatusMessage(
        (payload.items?.length ?? 0) > 0 ? t('mobile.inbox.live') : t('mobile.inbox.empty'),
      );
    } catch (error) {
      setLiveItems([]);
      setStatusMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('mobile.inbox.loadError'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t, usesDemoData]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const items = usesDemoData ? demoItems : liveItems ?? [];

  return (
    <SoreyaScreen eyebrow={t('navigation.inbox')} title={t('navigation.inbox')}>
      {statusMessage ? (
        <Section title={t('common.status')}>
          <DataRow
            title={t('navigation.inbox')}
            detail={statusMessage}
            badge={usesDemoData ? t('demo.badge') : isLoading ? '…' : t('common.ready')}
          />
        </Section>
      ) : null}

      <Section title={t('navigation.inbox')}>
        {isLoading && !usesDemoData ? (
          <DataRow title={t('common.loading')} detail={t('navigation.inbox')} badge="…" />
        ) : null}
        {items.length > 0 ? (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.channel}>
                {item.kind === 'whatsapp' ? t('labels.providers.whatsapp') : t('labels.providers.email')}
              </Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.preview}>
                {item.sender} · {item.preview}
              </Text>
            </View>
          ))
        ) : !isLoading ? (
          <DataRow title={t('mobile.inbox.empty')} detail={t('email.noMessages')} badge="0" />
        ) : null}
      </Section>

      <StatusBadge label={t('safety.approvalFirst')} tone="success" />
    </SoreyaScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    borderTopColor: '#e8e8e8',
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  channel: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  preview: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
