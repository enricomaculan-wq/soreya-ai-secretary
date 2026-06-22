import {
  analyzeQuickCallNote,
  analyzeQuickCallWithAI,
  buildQuickCallSuggestedActions,
  suggestQuickCallAlternativeSlots,
} from '@soreya/ai/quick-call-note';
import {
  createAppointmentRequestFromCallNote,
  createQuickCallNote,
  createQuickCallSuggestedActions,
  getCachedCalendarEvents,
  updateQuickCallNoteAnalysis,
} from '@soreya/database';
import type {
  QuickCallAnalysis,
  QuickCallResult,
  QuickCallSuggestedActionDraft,
  UserRule,
} from '@soreya/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { readQuickCallAnalysisFromResult } from '@/lib/quick-call-helpers';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';
import { postWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

type QuickCallPreview = Omit<QuickCallResult, 'suggestedActions'> & {
  suggestedActions: QuickCallSuggestedActionDraft[];
};

export default function QuickCallNoteScreen() {
  const { locale, t, label } = useI18n();
  const { user, userOrganization } = useSoreyaAuth();
  const [rawText, setRawText] = useState('');
  const [analysis, setAnalysis] = useState<QuickCallAnalysis | null>(null);
  const [preview, setPreview] = useState<QuickCallResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function analyze() {
    if (shouldUseMobileDemoData()) {
      const result = buildDemoQuickCallResult(rawText, locale);
      setAnalysis(readDemoQuickCallAnalysis(result, locale));
      setPreview(result);
      setMessage(t('quickCall.previewReady'));
      return;
    }

    if (!hasSupabaseMobileConfig() || !userOrganization) {
      setMessage(t('mobile.errors.configMissing'));
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      if (shouldUseMobileWebApi()) {
        const result = await postWebApi<QuickCallResult>('/api/quick-call/analyze', { rawText });
        setAnalysis(readQuickCallAnalysisFromResult(result, locale));
        setPreview(result);
      } else {
        const result = await buildPreview(rawText, userOrganization.organization.id, userOrganization.organization.default_timezone);
        setAnalysis(result.analysis);
        setPreview(result.preview);
      }
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
      const result = buildDemoQuickCallResult(rawText, locale);
      setAnalysis(readDemoQuickCallAnalysis(result, locale));
      setPreview(result);
      setMessage(t('approvals.pendingCreated', { count: result.suggestedActions.length }));
      return;
    }

    if (!hasSupabaseMobileConfig() || !user || !userOrganization) {
      setMessage(t('mobile.errors.configMissing'));
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      if (shouldUseMobileWebApi()) {
        const result = await postWebApi<QuickCallResult>('/api/quick-call/create', { rawText });
        setAnalysis(readQuickCallAnalysisFromResult(result, locale));
        setPreview(result);
        setMessage(t('approvals.pendingCreated', { count: result.suggestedActions.length }));
      } else {
        const result = await persistQuickCallPlan(
          rawText,
          userOrganization.organization.id,
          user.id,
          userOrganization.organization.default_timezone,
        );
        setAnalysis(result.analysis);
        setPreview(result.result);
        setMessage(t('approvals.pendingCreated', { count: result.result.suggestedActions.length }));
      }
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

  return (
    <SoreyaScreen eyebrow={t('quickCall.capture')} title={t('quickCall.title')}>
      <Section title={t('quickCall.whatCallerAsked')}>
        <TextInput
          value={rawText}
          onChangeText={(value) => {
            setRawText(value);
            setAnalysis(null);
            setPreview(null);
          }}
          placeholder={t('quickCall.placeholder')}
          placeholderTextColor="#a8a29e"
          multiline
          textAlignVertical="top"
          style={styles.noteInput}
        />
        <Text style={styles.dictationCopy}>{t('quickCall.dictationHint')}</Text>
        <View style={styles.actions}>
          <ActionButton disabled={isBusy || rawText.trim().length < 3} label={isBusy ? `${t('common.loading')}...` : t('quickCall.analyze')} onPress={analyze} />
          <ActionButton
            disabled={isBusy || rawText.trim().length < 3}
            label={t('quickCall.createPendingApprovals')}
            onPress={createPendingApprovals}
            tone="dark"
          />
        </View>
      </Section>

      {message ? (
        <Section title={t('common.status')}>
          <DataRow title={t('quickCall.title')} detail={message} badge={t('common.info')} />
        </Section>
      ) : null}

      {analysis && preview ? (
        <Section title={t('quickCall.result')}>
          <DataRow
            title={label('quickCallIntentTypes', analysis.intentType)}
            detail={`${t('approvals.aiConfidence')}: ${Math.round(analysis.confidence * 100)}% · ${analysis.usedFallback === false ? t('quickCall.aiAnalyzed') : t('quickCall.aiFallback')} · ${analysis.reason ?? t('quickCall.noReason')}`}
            badge={analysis.needsMoreInfo ? t('common.edit') : t('common.ready')}
            badgeTone={analysis.needsMoreInfo ? 'warning' : 'success'}
          />
          <DataRow
            title={analysis.customerName ?? t('quickCall.noCustomer')}
            detail={analysis.requestedDateTimeText ?? t('quickCall.noRequestedTime')}
            badge={label('actionTypes', analysis.suggestedReplyChannel)}
          />
          {analysis.missingFields.length ? (
            <DataRow title={t('quickCall.missingFields')} detail={analysis.missingFields.join(', ')} badge={t('common.review')} badgeTone="warning" />
          ) : null}
          <DataRow title={t('emergency.suggestedActions')} detail={t('common.pendingApproval')} badge={String(preview.suggestedActions.length)} />
          {preview.alternatives.slice(0, 3).map((slot) => (
            <DataRow key={slot.startsAt} title={t('calendar.alternativeSlots')} detail={formatDateTime(slot.startsAt, locale)} badge={`${slot.durationMinutes}m`} />
          ))}
          {analysis.suggestedReplyBody ? <Text style={styles.replyDraft}>{analysis.suggestedReplyBody}</Text> : null}
          {analysis.safetyNotes?.slice(0, 3).map((note) => (
            <DataRow key={note} title={t('quickCall.safetyNotes')} detail={note} badge={t('common.info')} />
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
      style={[styles.button, tone === 'dark' ? styles.darkButton : styles.lightButton, disabled ? styles.disabled : null]}>
      <Text style={[styles.buttonText, tone === 'dark' ? styles.darkButtonText : styles.lightButtonText]}>{label}</Text>
    </Pressable>
  );
}

function buildDemoQuickCallResult(rawText: string, locale: 'it' | 'en'): QuickCallResult {
  const demo = getMobileDemoData(locale).quickCallResult;

  if (!demo.callNote || rawText.trim().length < 3) {
    return demo;
  }

  return {
    ...demo,
    callNote: {
      ...demo.callNote,
      rawText: rawText.trim(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function readDemoQuickCallAnalysis(result: QuickCallResult, locale: 'it' | 'en'): QuickCallAnalysis {
  const note = result.callNote;
  const draftBody = result.suggestedActions
    .map((action) => {
      const payload = 'draftPayload' in action ? action.draftPayload : action.draft_payload;
      return payload && typeof payload === 'object' && !Array.isArray(payload) && typeof payload.body === 'string'
        ? payload.body
        : null;
    })
    .find((body): body is string => typeof body === 'string');

  return {
    intentType: note?.intentType ?? 'callback_request',
    confidence: note?.confidence ?? 0.85,
    customerName: note?.customerName ?? (locale === 'it' ? 'Cliente demo' : 'Demo customer'),
    customerEmail: note?.customerEmail ?? null,
    customerPhone: note?.customerPhone ?? null,
    requestedDateTimeText: note?.requestedDateTimeText ?? (locale === 'it' ? 'Orario demo' : 'Demo time'),
    requestedStartsAt: note?.requestedStartsAt ?? null,
    requestedEndsAt: note?.requestedEndsAt ?? null,
    reason: note?.reason ?? (locale === 'it' ? 'Nota chiamata demo' : 'Demo quick call note'),
    needsMoreInfo: false,
    missingFields: [],
    extractedConstraints: note?.extractedConstraints ?? {},
    suggestedReplyChannel: 'manual_review',
    suggestedReplyBody: draftBody ?? null,
    priority: 'normal',
    suggestedReplyTone: 'professional',
    safetyNotes: [locale === 'it'
      ? 'Modalità demo: nessun promemoria calendario o messaggio esterno viene creato.'
      : 'Demo mode: no calendar reminder or external message is created.'],
    aiProvider: 'heuristic',
    aiModel: null,
    usedFallback: true,
  };
}

async function buildPreview(
  rawText: string,
  organizationId: string,
  timezone: string,
): Promise<{ analysis: QuickCallAnalysis; preview: QuickCallPreview }> {
  const heuristic = analyzeQuickCallNote(rawText, { timezone });
  const analysis = await analyzeQuickCallWithAI(rawText, { timezone, fallbackAnalysis: heuristic });
  const [events, userRules] = await Promise.all([
    getEventsForQuickCall(organizationId, analysis),
    getActiveUserRules(organizationId),
  ]);
  const alternatives = suggestQuickCallAlternativeSlots(events, userRules, analysis);

  return {
    analysis,
    preview: {
      callNote: null,
      appointmentRequest: null,
      suggestedActions: buildQuickCallSuggestedActions(null, analysis, alternatives),
      warnings: buildWarnings(analysis),
      alternatives,
    },
  };
}

async function persistQuickCallPlan(
  rawText: string,
  organizationId: string,
  userId: string,
  timezone: string,
): Promise<{ analysis: QuickCallAnalysis; result: QuickCallResult }> {
  const { analysis, preview } = await buildPreview(rawText, organizationId, timezone);
  const supabase = getSupabaseMobileClient();
  const callNote = await createQuickCallNote(supabase, {
    organizationId,
    createdBy: userId,
    rawText,
  });
  const analyzedCallNote = await updateQuickCallNoteAnalysis(supabase, {
    organizationId,
    callNoteId: callNote.id,
    analysis,
    status: 'pending_approval',
  });
  const appointmentRequest = await createAppointmentRequestFromCallNote(supabase, {
    organizationId,
    callNote: analyzedCallNote,
    analysis,
    alternatives: preview.alternatives,
  });
  const drafts = buildQuickCallSuggestedActions(analyzedCallNote, analysis, preview.alternatives);
  const suggestedActions = await createQuickCallSuggestedActions(
    supabase,
    drafts.map((draft) => ({
      ...draft,
      organizationId,
      callNoteId: analyzedCallNote.id,
      appointmentRequestId: appointmentRequest?.id ?? null,
    })),
  );

  return {
    analysis,
    result: {
      callNote: analyzedCallNote,
      appointmentRequest,
      suggestedActions,
      warnings: preview.warnings,
      alternatives: preview.alternatives,
    },
  };
}

async function getEventsForQuickCall(organizationId: string, analysis: QuickCallAnalysis) {
  const start = analysis.requestedStartsAt
    ? new Date(Math.min(new Date(analysis.requestedStartsAt).getTime(), Date.now()))
    : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 14);

  return getCachedCalendarEvents(getSupabaseMobileClient(), organizationId, start.toISOString(), end.toISOString());
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

function buildWarnings(analysis: QuickCallAnalysis): string[] {
  const warnings: string[] = [];

  if (analysis.needsMoreInfo) {
    warnings.push(`Missing fields: ${analysis.missingFields.join(', ')}.`);
  }

  if (analysis.suggestedReplyChannel === 'manual_review') {
    warnings.push('No reliable email or phone was detected; follow-up needs manual review.');
  }

  if (analysis.usedFallback) {
    warnings.push('AI fallback used; heuristic analysis prepared the draft.');
  }

  return warnings;
}

function formatDateTime(value: string, locale: 'it' | 'en') {
  return new Intl.DateTimeFormat(locale === 'it' ? 'it-IT' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  noteInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontSize: 16,
    minHeight: 180,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dictationCopy: {
    color: '#737373',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  button: {
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
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  darkButtonText: {
    color: '#ffffff',
  },
  lightButtonText: {
    color: '#525252',
  },
  replyDraft: {
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    color: '#525252',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
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
