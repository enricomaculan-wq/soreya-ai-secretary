import { buildEmergencyPlan } from '@soreya/ai/emergency-mode';
import {
  createEmergencyAction,
  createEmergencySuggestedActions,
  createRescheduleBatch,
  createRescheduleProposals,
  getEventsForEmergencyTarget,
  updateEmergencyActionStatus,
} from '@soreya/database';
import type {
  Contact,
  EmergencyActionType,
  EmergencyMessageTone,
  EmergencyModeRequest,
  EmergencyModeResult,
  EmergencySuggestedActionDraft,
  EmergencyTargetWindow,
  IncomingMessage,
  Json,
  RescheduleProposal,
  UserRule,
} from '@soreya/shared';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';
import { postWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

type EmergencyPlanPreview = Omit<EmergencyModeResult, 'suggestedActions'> & {
  suggestedActions: EmergencySuggestedActionDraft[];
};

type EmergencyForm = {
  type: EmergencyActionType;
  targetDate: string;
  reason: string;
  delayMinutes: string;
  messageTone: EmergencyMessageTone;
  targetWindow: EmergencyTargetWindow;
  customMessage: string;
};

type QuickAction = {
  titleKey: string;
  detailKey: string;
  type: EmergencyActionType;
  targetWindow: EmergencyTargetWindow;
};

const quickActions: QuickAction[] = [
  {
    titleKey: 'labels.emergencyActionTypes.reschedule_all_today',
    detailKey: 'labels.emergencyActionTypes.reschedule_all_today',
    type: 'reschedule_all_today',
    targetWindow: 'all_day',
  },
  {
    titleKey: 'labels.emergencyActionTypes.reschedule_morning',
    detailKey: 'labels.emergencyActionTypes.reschedule_morning',
    type: 'reschedule_morning',
    targetWindow: 'morning',
  },
  {
    titleKey: 'labels.emergencyActionTypes.reschedule_afternoon',
    detailKey: 'labels.emergencyActionTypes.reschedule_afternoon',
    type: 'reschedule_afternoon',
    targetWindow: 'afternoon',
  },
  {
    titleKey: 'labels.emergencyActionTypes.notify_delay',
    detailKey: 'labels.emergencyActionTypes.notify_delay',
    type: 'notify_delay',
    targetWindow: 'all_day',
  },
  {
    titleKey: 'labels.emergencyActionTypes.block_today',
    detailKey: 'labels.emergencyActionTypes.block_today',
    type: 'block_today',
    targetWindow: 'all_day',
  },
  {
    titleKey: 'labels.emergencyActionTypes.notify_all_today',
    detailKey: 'labels.emergencyActionTypes.notify_all_today',
    type: 'notify_all_today',
    targetWindow: 'all_day',
  },
];

const initialForm: EmergencyForm = {
  type: 'reschedule_all_today',
  targetDate: dateKeyForToday(),
  reason: '',
  delayMinutes: '15',
  messageTone: 'professional',
  targetWindow: 'all_day',
  customMessage: '',
};

export default function EmergencyScreen() {
  const { locale, t } = useI18n();
  const { user, userOrganization } = useSoreyaAuth();
  const [form, setForm] = useState<EmergencyForm>(() => ({ ...initialForm, reason: t('emergency.defaultReason') }));
  const [preview, setPreview] = useState<EmergencyModeResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function previewPlan() {
    if (shouldUseMobileDemoData()) {
      setPreview(getMobileDemoData(locale).emergencyResult);
      setMessage(`${t('common.preview')}. ${t('demo.description')}`);
      return;
    }

    if (!hasSupabaseMobileConfig() || !userOrganization) {
      setMessage(t('mobile.errors.configMissing'));
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const request = toRequest(form, t('emergency.defaultReason'));
      const result = shouldUseMobileWebApi()
        ? await postWebApi<EmergencyPlanPreview>('/api/emergency/preview', request)
        : await buildPreview(request, userOrganization.organization.id);
      setPreview(result);
      setMessage(t('common.previewReadyNoChanges'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function createPendingApprovals() {
    if (shouldUseMobileDemoData()) {
      const result = getMobileDemoData(locale).emergencyResult;
      setPreview(result);
      setMessage(`${result.suggestedActions.length} ${t('common.pendingApproval')}. ${t('demo.description')}`);
      return;
    }

    if (!hasSupabaseMobileConfig() || !user || !userOrganization) {
      setMessage(t('mobile.errors.configMissing'));
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const request = toRequest(form, t('emergency.defaultReason'));
      const result = shouldUseMobileWebApi()
        ? await postWebApi<EmergencyModeResult>('/api/emergency/create', request)
        : await persistEmergencyPlan(userOrganization.organization.id, user.id, request);

      setPreview(result);
      setMessage(t('approvals.pendingCreated', { count: result.suggestedActions.length }));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsBusy(false);
    }
  }

  function applyQuickAction(action: QuickAction) {
    setForm((current) => ({
      ...current,
      type: action.type,
      targetWindow: action.targetWindow,
      reason: t(action.titleKey),
      delayMinutes: action.type === 'notify_delay' ? current.delayMinutes || '15' : current.delayMinutes,
    }));
    setPreview(null);
  }

  return (
    <SoreyaScreen eyebrow={t('multiDevice.safety')} title={t('emergency.title')}>
      <Section title={t('emergency.safetyTitle')}>
        <DataRow
          title={t('approvals.executionLocked')}
          detail={`${t('emergency.noExternalExecution')} ${t('safety.approvalFirst')}`}
          badge={t('common.pendingApproval')}
          badgeTone="success"
        />
        {message ? <DataRow title={t('common.status')} detail={message} badge={t('common.info')} /> : null}
      </Section>

      <Section title={t('emergency.quickActions')}>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.type}
              onPress={() => applyQuickAction(action)}
              style={[styles.quickButton, form.type === action.type ? styles.quickButtonActive : null]}>
              <Text style={styles.quickTitle}>{t(action.titleKey)}</Text>
              <Text style={styles.quickDetail}>{t(action.detailKey)}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={t('emergency.request')}>
        <Field label={t('emergency.targetDate')}>
          <TextInput
            onChangeText={(value) => setFormValue('targetDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#a8a29e"
            style={styles.input}
            value={form.targetDate}
          />
        </Field>
        <Field label={t('emergency.reason')}>
          <TextInput
            onChangeText={(value) => setFormValue('reason', value)}
            placeholder={t('emergency.reason')}
            placeholderTextColor="#a8a29e"
            style={styles.input}
            value={form.reason}
          />
        </Field>
        {form.type === 'notify_delay' ? (
          <Field label={t('emergency.delayMinutes')}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) => setFormValue('delayMinutes', value)}
              placeholder="15"
              placeholderTextColor="#a8a29e"
              style={styles.input}
              value={form.delayMinutes}
            />
          </Field>
        ) : null}
        <View style={styles.toneRow}>
          {(['professional', 'friendly', 'short', 'apologetic'] as const).map((tone) => (
            <Pressable
              key={tone}
              onPress={() => setFormValue('messageTone', tone)}
              style={[styles.toneButton, form.messageTone === tone ? styles.toneButtonActive : null]}>
              <Text style={[styles.toneButtonText, form.messageTone === tone ? styles.toneButtonTextActive : null]}>{t(`emergency.tones.${tone}`)}</Text>
            </Pressable>
          ))}
        </View>
        <Field label={t('emergency.customMessage')}>
          <TextInput
            multiline
            onChangeText={(value) => setFormValue('customMessage', value)}
            placeholder={t('common.optional')}
            placeholderTextColor="#a8a29e"
            style={[styles.input, styles.textArea]}
            value={form.customMessage}
          />
        </Field>

        <View style={styles.actions}>
          <ActionButton disabled={isBusy} label={isBusy ? `${t('common.loading')}...` : t('common.preview')} onPress={previewPlan} />
          <ActionButton
            disabled={isBusy}
            label={t('emergency.createActionsCta')}
            onPress={createPendingApprovals}
            tone="dark"
          />
        </View>
      </Section>

      {preview ? (
        <Section title={t('common.preview')}>
          <DataRow title={t('emergency.affectedEvents')} detail={t('calendar.cachedEvents')} badge={String(preview.affectedEvents.length)} />
          <DataRow title={t('emergency.proposals')} detail={t('safety.approvalFirst')} badge={String(preview.proposals.length)} />
          <DataRow title={t('emergency.suggestedActions')} detail={t('common.pendingApproval')} badge={String(preview.suggestedActions.length)} />

          {preview.proposals.slice(0, 4).map((proposal) => (
            <View key={`${proposal.calendarEventId}-${proposal.originalStartsAt}`} style={styles.proposal}>
              <DataRow
                title={proposal.recipientName ?? proposal.recipientEmail ?? proposal.recipientPhone ?? t('emergency.manualReview')}
                detail={`${formatTime(proposal.originalStartsAt, locale)} · ${proposal.preferredChannel}`}
                badge={proposal.proposedStartsAt ? t('emergency.slot') : t('common.review')}
                badgeTone={proposal.proposedStartsAt ? 'success' : 'warning'}
              />
              <Text style={styles.messageBody}>{proposal.messageBody}</Text>
            </View>
          ))}

          {preview.warnings.slice(0, 4).map((warning) => (
            <DataRow key={warning} title={t('emergency.warnings')} detail={warning} badge={t('emergency.check')} badgeTone="warning" />
          ))}

          <Link href="/(tabs)/approvals" asChild>
            <Pressable style={styles.linkButton}>
              <Text style={styles.linkButtonText}>{t('navigation.approvals')}</Text>
            </Pressable>
          </Link>
        </Section>
      ) : null}

      <StatusBadge
        label={t('safety.approvalFirst')}
        tone="success"
      />
    </SoreyaScreen>
  );

  function setFormValue<K extends keyof EmergencyForm>(key: K, value: EmergencyForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone = 'light',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'dark' | 'light';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButton, tone === 'dark' ? styles.darkButton : styles.lightButton, disabled ? styles.disabled : null]}>
      <Text style={[styles.actionButtonText, tone === 'dark' ? styles.darkButtonText : styles.lightButtonText]}>{label}</Text>
    </Pressable>
  );
}

async function buildPreview(
  request: EmergencyModeRequest,
  organizationId: string,
): Promise<EmergencyPlanPreview> {
  const supabase = getSupabaseMobileClient();
  const [events, contacts, recentMessages, userRules] = await Promise.all([
    getEventsForEmergencyTarget(supabase, organizationId, request.targetDate, request.targetWindow ?? 'all_day'),
    getContacts(organizationId),
    getRecentMessages(organizationId),
    getActiveUserRules(organizationId),
  ]);

  return buildEmergencyPlan({
    organizationId,
    request,
    events,
    contacts,
    recentMessages,
    userRules,
  }) as EmergencyPlanPreview;
}

async function persistEmergencyPlan(
  organizationId: string,
  userId: string,
  request: EmergencyModeRequest,
): Promise<EmergencyModeResult> {
  const supabase = getSupabaseMobileClient();
  const preview = await buildPreview(request, organizationId);
  const emergencyAction = await createEmergencyAction(supabase, {
    organizationId,
    createdBy: userId,
    type: request.type,
    status: 'pending_approval',
    reason: request.reason,
    targetDate: request.targetDate,
    delayMinutes: request.delayMinutes ?? null,
    messageTone: request.messageTone ?? 'professional',
    affectedEventsCount: preview.affectedEvents.length,
    suggestedActionsCount: preview.suggestedActions.length,
    metadata: {
      request: request as unknown as Json,
      warnings: preview.warnings,
      createdFrom: 'mobile',
    },
  });
  const needsBatch = ['reschedule_all_today', 'reschedule_morning', 'reschedule_afternoon'].includes(request.type);
  const batch = needsBatch
    ? await createRescheduleBatch(supabase, {
        organizationId,
        emergencyActionId: emergencyAction.id,
        targetDate: request.targetDate,
        affectedEventsCount: preview.affectedEvents.length,
      })
    : null;
  const proposals = await createRescheduleProposals(
    supabase,
    preview.proposals.map((proposal) => ({
      organizationId,
      emergencyActionId: emergencyAction.id,
      rescheduleBatchId: batch?.id ?? null,
      calendarEventId: proposal.calendarEventId,
      contactId: proposal.contactId,
      originalStartsAt: proposal.originalStartsAt,
      originalEndsAt: proposal.originalEndsAt,
      proposedStartsAt: proposal.proposedStartsAt,
      proposedEndsAt: proposal.proposedEndsAt,
      recipientName: proposal.recipientName,
      recipientEmail: proposal.recipientEmail,
      recipientPhone: proposal.recipientPhone,
      preferredChannel: proposal.preferredChannel,
      messageBody: proposal.messageBody,
      status: 'draft',
    })),
  );
  const proposalByEvent = new Map(proposals.map((proposal) => [proposal.calendarEventId, proposal]));
  const suggestedActions = await createEmergencySuggestedActions(
    supabase,
    preview.suggestedActions.map((draft) => ({
      ...draft,
      organizationId,
      emergencyActionId: emergencyAction.id,
      rescheduleProposalId: findProposalIdForDraft(draft.draftPayload, proposalByEvent),
    })),
  );
  const { error: countError } = await supabase
    .from('emergency_actions')
    .update({ suggested_actions_count: suggestedActions.length })
    .eq('organization_id', organizationId)
    .eq('id', emergencyAction.id);

  if (countError) {
    throw countError;
  }

  const updatedEmergencyAction = await updateEmergencyActionStatus(supabase, organizationId, emergencyAction.id, 'pending_approval');

  return {
    emergencyAction: {
      ...updatedEmergencyAction,
      suggestedActionsCount: suggestedActions.length,
    },
    affectedEvents: preview.affectedEvents,
    proposals,
    suggestedActions,
    warnings: preview.warnings,
  };
}

async function getContacts(organizationId: string): Promise<Contact[]> {
  const { data, error } = await getSupabaseMobileClient()
    .from('contacts')
    .select('*')
    .eq('organization_id', organizationId)
    .limit(200);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getRecentMessages(organizationId: string): Promise<IncomingMessage[]> {
  const { data, error } = await getSupabaseMobileClient()
    .from('incoming_messages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('received_at', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getActiveUserRules(organizationId: string): Promise<UserRule[]> {
  const { data, error } = await getSupabaseMobileClient()
    .from('user_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}

function findProposalIdForDraft(
  payload: Json,
  proposalByEvent: Map<string, RescheduleProposal>,
): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const calendarEventId = payload.calendarEventId;
  return typeof calendarEventId === 'string' ? proposalByEvent.get(calendarEventId)?.id ?? null : null;
}

function toRequest(form: EmergencyForm, fallbackReason: string): EmergencyModeRequest {
  return {
    type: form.type,
    targetDate: form.targetDate.trim(),
    reason: form.reason.trim() || fallbackReason,
    delayMinutes: Number(form.delayMinutes) || null,
    messageTone: form.messageTone,
    targetWindow: form.targetWindow,
    customMessage: form.customMessage.trim() || null,
  };
}

function dateKeyForToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatTime(value: string, locale: 'it' | 'en') {
  return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 92,
    minWidth: '47%',
    padding: 14,
  },
  quickButtonActive: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  quickTitle: {
    color: '#171717',
    fontSize: 14,
    fontWeight: '800',
  },
  quickDetail: {
    color: '#737373',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  field: {
    gap: 6,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#525252',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  toneRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  toneButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  toneButtonActive: {
    backgroundColor: '#171717',
    borderColor: '#171717',
  },
  toneButtonText: {
    color: '#525252',
    fontSize: 12,
    fontWeight: '700',
  },
  toneButtonTextActive: {
    color: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  darkButton: {
    backgroundColor: '#171717',
  },
  lightButton: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  darkButtonText: {
    color: '#ffffff',
  },
  lightButtonText: {
    color: '#525252',
  },
  proposal: {
    borderTopColor: '#e8e8e8',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  messageBody: {
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    color: '#525252',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    padding: 12,
  },
  linkButton: {
    alignItems: 'center',
    backgroundColor: '#171717',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
  },
  linkButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
