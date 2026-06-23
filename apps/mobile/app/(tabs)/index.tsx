import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  analyzeDemoCustomerRequest,
  buildDemoApprovalFromRequest,
  type ApprovalState,
  type Json,
  type SuggestedAction,
  type DemoCustomerRequestAnalysis,
  type DemoDetectedIntent,
  type DemoPlaygroundChannel,
  type SupportedLocale,
} from '@soreya/shared';
import { Link, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ClinicalIllustration, mobileTrustIllustrations } from '@/components/clinical-illustration';
import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData } from '@/lib/demo-data';
import { addDemoPlaygroundAction } from '@/lib/demo-state';
import { useI18n } from '@/lib/i18n';
import { readMobilePresentationMode } from '@/lib/presentation-mode';

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
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPresentationMode() {
      const enabled = await readMobilePresentationMode();
      if (!isMounted) {
        return;
      }

      setPresentationMode(enabled);
      if (enabled) {
        setChannel('whatsapp');
      }
    }

    void loadPresentationMode();

    return () => {
      isMounted = false;
    };
  }, []);

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

    const baseAction = buildDemoApprovalFromRequest({
      ...analysis,
      suggestedReply: editedReply,
    });
    const now = new Date().toISOString();
    const demo = getMobileDemoData(locale);
    const payload = toJsonObject(baseAction.draft_payload);
    const action: SuggestedAction = {
      ...baseAction,
      id: draftActionId ?? baseAction.id,
      status,
      draft_payload: {
        ...payload,
        body: editedReply,
        editedInDemo: editedReply !== analysis.suggestedReply,
      } as Json,
      approved_by: status === 'approved' ? demo.membership.user_id : null,
      approved_at: status === 'approved' ? now : null,
      updated_at: now,
    };

    addDemoPlaygroundAction(locale, action);

    const recentAction: RecentDemoAction = {
      id: action.id,
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
    <SoreyaScreen
      eyebrow={presentationMode ? t('demo.badge') : t('landing.hero.eyebrow')}
      title={presentationMode ? t('demoApp.hero.title') : t('demoApp.hero.title')}>
      <View style={styles.trustRow}>
        {mobileTrustIllustrations.map((variant) => (
          <ClinicalIllustration key={variant} variant={variant} />
        ))}
      </View>
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

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
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
    appointment_confirmation: 'demoPlayground.summary.appointmentConfirmation',
    callback_request: 'demoPlayground.summary.callback',
    manual_review: 'demoPlayground.summary.manualReview',
  };

  const params =
    analysis.detectedIntent === 'appointment_confirmation'
      ? { confirmedTime: requestedTime }
      : { requestedTime };

  return translate(summaryKeyByIntent[analysis.detectedIntent], params);
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
  trustRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 4,
    marginTop: -6,
  },
  requestInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontSize: 16,
    lineHeight: 23,
    minHeight: 150,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
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
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  channelButtonActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  channelButtonText: {
    color: '#525252',
    fontSize: 12,
    fontWeight: '800',
  },
  channelButtonTextActive: {
    color: '#ffffff',
  },
  replyLabel: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },
  replyInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
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
    borderColor: '#e8e8e8',
  },
  darkButton: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lightButtonText: {
    color: '#525252',
  },
  darkButtonText: {
    color: '#ffffff',
  },
  secondaryGrid: {
    gap: 10,
  },
  secondaryTile: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  secondaryTitle: {
    color: '#171717',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryDetail: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
});
