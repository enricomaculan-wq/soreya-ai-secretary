import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  analyzeDemoCustomerRequest,
  buildDemoApprovalFromRequest,
  type ApprovalState,
  type DemoCustomerRequestAnalysis,
  type DemoDetectedIntent,
  type DemoPlaygroundChannel,
  type SupportedLocale,
} from '@soreya/shared';
import { Link, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { useI18n } from '@/lib/i18n';

type DemoActionStatus = Extract<ApprovalState, 'approved' | 'edited' | 'ignored' | 'pending_approval'>;

type RecentDemoAction = {
  id: string;
  status: DemoActionStatus;
  title: string;
  body: string;
  updatedAt: string;
};

type SecondaryLink = {
  href: Href;
  titleKey: string;
  detailKey: string;
};

const channels: DemoPlaygroundChannel[] = ['email', 'whatsapp', 'quick_call'];
const exampleKeys = ['quoteTomorrow', 'rescheduleThursday', 'late'] as const;
const recentStorageKey = 'soreya.mobile.demo.recent';
const secondaryLinks: SecondaryLink[] = [
  {
    href: '/(tabs)/approvals',
    titleKey: 'navigation.approvals',
    detailKey: 'demoApp.recent.title',
  },
  {
    href: '/(tabs)/emergency',
    titleKey: 'emergency.title',
    detailKey: 'demoApp.secondary.emergency.description',
  },
  {
    href: '/(tabs)/quick-call-note',
    titleKey: 'quickCall.title',
    detailKey: 'demoApp.secondary.quickCall.description',
  },
];

export default function TodayScreen() {
  const { locale, t, label } = useI18n();
  const [channel, setChannel] = useState<DemoPlaygroundChannel>('email');
  const [customerText, setCustomerText] = useState('');
  const [analysis, setAnalysis] = useState<DemoCustomerRequestAnalysis | null>(null);
  const [editedReply, setEditedReply] = useState('');
  const [recentActions, setRecentActions] = useState<RecentDemoAction[]>([]);
  const [draftActionId, setDraftActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const examples = useMemo(
    () => exampleKeys.map((key) => ({ key, text: t(`demoPlayground.examples.${key}`) })),
    [t],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadRecentActions() {
      const stored = await AsyncStorage.getItem(`${recentStorageKey}.${locale}`);
      const parsed = stored ? parseRecentActions(stored) : [];

      if (isMounted) {
        setRecentActions(parsed);
      }
    }

    void loadRecentActions();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  function runAnalysis() {
    const nextAnalysis = analyzeDemoCustomerRequest({
      channel,
      customerText,
      locale,
    });

    setAnalysis(nextAnalysis);
    setEditedReply(nextAnalysis.suggestedReply);
    setDraftActionId(null);
    setMessage(t('demoPlayground.status.analysisReady'));
  }

  async function saveAction(status: DemoActionStatus) {
    if (!analysis) {
      return;
    }

    const action = buildDemoApprovalFromRequest({
      ...analysis,
      suggestedReply: editedReply,
    });
    const recentAction: RecentDemoAction = {
      id: draftActionId ?? action.id,
      status,
      title: action.title,
      body: editedReply,
      updatedAt: new Date().toISOString(),
    };
    const nextActions = [
      recentAction,
      ...recentActions.filter((item) => item.id !== recentAction.id),
    ].slice(0, 3);

    setDraftActionId(recentAction.id);
    setRecentActions(nextActions);
    await AsyncStorage.setItem(`${recentStorageKey}.${locale}`, JSON.stringify(nextActions));
  }

  async function approveReply() {
    await saveAction('approved');
    setMessage(t('demoPlayground.status.approved'));
  }

  async function editReply() {
    await saveAction('edited');
    setMessage(t('demoPlayground.status.edited'));
  }

  async function ignoreReply() {
    await saveAction('ignored');
    setMessage(t('demoPlayground.status.ignored'));
  }

  return (
    <SoreyaScreen eyebrow={t('common.appName')} title={t('demoApp.hero.title')}>
      <Section title={t('demoPlayground.customerRequest')}>
        <TextInput
          value={customerText}
          onChangeText={(value) => {
            setCustomerText(value);
            setMessage(null);
          }}
          placeholder={t('demoPlayground.placeholder')}
          placeholderTextColor="#a8a29e"
          multiline
          textAlignVertical="top"
          style={styles.requestInput}
        />
        <Pressable onPress={runAnalysis} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{t('demoPlayground.analyzeButton')}</Text>
        </Pressable>
        <View style={styles.channelRow}>
          {channels.map((item) => (
            <Pressable
              key={item}
              onPress={() => setChannel(item)}
              style={[styles.channelButton, channel === item ? styles.channelButtonActive : null]}>
              <Text style={[styles.channelButtonText, channel === item ? styles.channelButtonTextActive : null]}>
                {t(`demoPlayground.channels.${item === 'quick_call' ? 'quickCall' : item}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.examples}>
          {examples.map((example) => (
            <Pressable key={example.key} onPress={() => setCustomerText(example.text)} style={styles.exampleButton}>
              <Text style={styles.exampleText}>{example.text}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {analysis ? (
        <Section title={t('demoPlayground.results.title')}>
          <DataRow
            title={t('demoPlayground.results.understood')}
            detail={buildUnderstandingSummary(analysis, t)}
            badge={t('common.ready')}
            badgeTone="success"
          />
          <DataRow
            title={t('demoPlayground.results.calendar')}
            detail={buildCalendarSummary(analysis, locale, t)}
            badge={analysis.conflictDetected ? t('common.review') : t('common.available')}
            badgeTone={analysis.conflictDetected ? 'warning' : 'success'}
          />
          <Text style={styles.replyLabel}>{t('demoPlayground.results.readyReply')}</Text>
          <TextInput
            value={editedReply}
            onChangeText={setEditedReply}
            multiline
            textAlignVertical="top"
            style={styles.replyInput}
          />
          <View style={styles.actions}>
            <ActionButton label={t('demoPlayground.actions.approveResponse')} onPress={approveReply} tone="dark" />
            <ActionButton label={t('common.edit')} onPress={editReply} />
            <ActionButton label={t('common.ignore')} onPress={ignoreReply} />
          </View>
        </Section>
      ) : null}

      {message ? (
        <Section title={t('common.status')}>
          <DataRow title={t('demoPlayground.title')} detail={message} badge={t('common.info')} />
        </Section>
      ) : null}

      <Section title={t('demoApp.recent.title')}>
        {recentActions.length > 0 ? (
          recentActions.map((action) => (
            <DataRow
              key={action.id}
              title={action.title}
              detail={action.body}
              badge={label('approvalStatus', action.status)}
              badgeTone={action.status === 'approved' ? 'success' : action.status === 'ignored' ? 'neutral' : 'warning'}
            />
          ))
        ) : (
          <DataRow title={t('demoApp.recent.empty')} detail={t('demo.sandboxCopy')} badge="0" />
        )}
      </Section>

      <Section title={t('navigation.overview')}>
        <View style={styles.secondaryGrid}>
          {secondaryLinks.map((item) => (
            <Link key={item.titleKey} href={item.href} asChild>
              <Pressable style={styles.secondaryTile}>
                <Text style={styles.secondaryTitle}>{t(item.titleKey)}</Text>
                <Text style={styles.secondaryDetail}>{t(item.detailKey)}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </Section>

      <StatusBadge label={t('demo.badge')} tone="neutral" />
      <StatusBadge label={t('systemStatus.approvalFirst')} tone="success" />
    </SoreyaScreen>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'light',
}: {
  label: string;
  onPress: () => void;
  tone?: 'dark' | 'light';
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, tone === 'dark' ? styles.darkButton : styles.lightButton]}>
      <Text style={[styles.actionButtonText, tone === 'dark' ? styles.darkButtonText : styles.lightButtonText]}>{label}</Text>
    </Pressable>
  );
}

function parseRecentActions(value: string): RecentDemoAction[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is RecentDemoAction =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        typeof item.updatedAt === 'string' &&
        ['approved', 'edited', 'ignored', 'pending_approval'].includes(String(item.status)),
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}

function buildUnderstandingSummary(
  analysis: DemoCustomerRequestAnalysis,
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  const requestedTime = analysis.requestedDateTimeText ?? translate('demoPlayground.results.noRequestedTime');
  const summaryKeyByIntent: Record<DemoDetectedIntent, string> = {
    new_appointment: 'demoPlayground.summary.newAppointment',
    reschedule_appointment: 'demoPlayground.summary.reschedule',
    delay_notice: 'demoPlayground.summary.delay',
    cancel_appointment: 'demoPlayground.summary.cancellation',
    appointment_lookup: 'demoPlayground.summary.appointmentLookup',
    callback_request: 'demoPlayground.summary.callback',
    manual_review: 'demoPlayground.summary.manualReview',
  };

  return translate(summaryKeyByIntent[analysis.detectedIntent], { requestedTime });
}

function buildCalendarSummary(
  analysis: DemoCustomerRequestAnalysis,
  locale: SupportedLocale,
  translate: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
) {
  const alternatives = analysis.alternatives
    .slice(0, 2)
    .map((slot) => formatTime(slot.startsAt, locale))
    .join(' / ');

  if (!analysis.isAppointmentRequest && analysis.detectedIntent !== 'callback_request') {
    return translate('demoPlayground.calendar.noCalendarNeeded');
  }

  if (analysis.conflictDetected) {
    return translate('demoPlayground.calendar.conflict', {
      alternatives: alternatives || translate('demoPlayground.results.noAlternatives'),
    });
  }

  if (analysis.alternatives.length > 0) {
    return translate('demoPlayground.calendar.available', { alternatives });
  }

  return translate('demoPlayground.calendar.needsReview');
}

function formatTime(value: string, locale: SupportedLocale) {
  return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  requestInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1c1917',
    fontSize: 16,
    lineHeight: 23,
    minHeight: 150,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1c1917',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  channelButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  channelButtonActive: {
    backgroundColor: '#1c1917',
    borderColor: '#1c1917',
  },
  channelButtonText: {
    color: '#57534e',
    fontSize: 12,
    fontWeight: '800',
  },
  channelButtonTextActive: {
    color: '#ffffff',
  },
  examples: {
    gap: 8,
    marginTop: 14,
  },
  exampleButton: {
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  exampleText: {
    color: '#57534e',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  replyLabel: {
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  replyInput: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1c1917',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    minHeight: 132,
    padding: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  lightButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
  },
  darkButton: {
    backgroundColor: '#1c1917',
    borderColor: '#1c1917',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lightButtonText: {
    color: '#57534e',
  },
  darkButtonText: {
    color: '#ffffff',
  },
  secondaryGrid: {
    gap: 10,
  },
  secondaryTile: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  secondaryTitle: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryDetail: {
    color: '#78716c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
});
