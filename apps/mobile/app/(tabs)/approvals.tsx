import {
  approveSuggestedAction,
  editSuggestedAction,
  getSuggestedActions,
  ignoreSuggestedAction,
  rejectSuggestedAction,
} from '@soreya/database';
import type { ExecutionPreview, Json, SuggestedAction } from '@soreya/shared';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useDemoSuggestedActions } from '@/lib/demo-state';
import { buildDemoExecutionPreview } from '@/lib/execution-demo';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';
import { fetchWebApi, postWebApi, shouldUseMobileWebApi } from '@/lib/web-api';

type EditingState = {
  actionId: string;
  value: string;
  mode: 'body' | 'payload';
};

type ExecutionResultState = {
  status?: string;
  dryRun?: boolean;
  message?: string | null;
};

export default function ApprovalsScreen() {
  const { locale, t, label } = useI18n();
  const { user, userOrganization } = useSoreyaAuth();
  const demoMode = shouldUseMobileDemoData();
  const [demoActions, setDemoActions] = useDemoSuggestedActions(locale);
  const [liveActions, setLiveActions] = useState<SuggestedAction[]>([]);
  const actions = demoMode ? demoActions : liveActions;
  const setActions = demoMode ? setDemoActions : setLiveActions;
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [executionPreviews, setExecutionPreviews] = useState<Record<string, ExecutionPreview>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, ExecutionResultState>>({});
  const [confirmationTexts, setConfirmationTexts] = useState<Record<string, string>>({});

  const loadApprovals = useCallback(async () => {
    if (demoMode) {
      setMessage(t('demo.description'));
      return;
    }

    if (!hasSupabaseMobileConfig() || !userOrganization) {
      setLiveActions([]);
      setMessage(t('mobile.errors.configMissing'));
      return;
    }

    setIsLoading(true);

    try {
      if (shouldUseMobileWebApi()) {
        const payload = await fetchWebApi<{ actions?: SuggestedAction[] }>(
          '/api/approvals/list?limit=50&statuses=pending_approval,edited,approved',
        );
        setLiveActions(payload.actions ?? []);
        setMessage(t('mobile.webApiHint'));
        return;
      }

      const rows = await getSuggestedActions(getSupabaseMobileClient(), userOrganization.organization.id, {
        statuses: ['pending_approval', 'edited', 'approved'],
        limit: 50,
      });
      setLiveActions(rows);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setIsLoading(false);
    }
  }, [demoMode, t, userOrganization]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!isMounted) {
        return;
      }

      await loadApprovals();
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadApprovals]);

  async function approve(action: SuggestedAction) {
    if (demoMode) {
      setActions((current) =>
        current.map((item) =>
          item.id === action.id
            ? {
                ...item,
                status: 'approved',
                approved_by: getMobileDemoData(locale).membership.user_id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      setMessage(t('approvals.demoApproved'));
      return;
    }

    if (!user || !userOrganization) {
      return;
    }

    try {
      if (shouldUseMobileWebApi()) {
        const payload = await postWebApi<{ action?: SuggestedAction }>('/api/approvals/approve', {
          suggestedActionId: action.id,
          note: t('approvals.approvedReady'),
        });
        if (payload.action) {
          setActions((current) => current.map((item) => (item.id === action.id ? payload.action! : item)));
        }
      } else {
        const updated = await approveSuggestedAction(getSupabaseMobileClient(), {
          organizationId: userOrganization.organization.id,
          suggestedActionId: action.id,
          userId: user.id,
          note: t('approvals.approvedReady'),
        });
        setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
      }
      setMessage(t('approvals.approvedReady'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    }
  }

  async function reject(action: SuggestedAction) {
    if (demoMode) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.demoRejected'));
      return;
    }

    if (!user || !userOrganization) {
      return;
    }

    try {
      if (shouldUseMobileWebApi()) {
        await postWebApi('/api/approvals/reject', {
          suggestedActionId: action.id,
          note: t('common.reject'),
        });
      } else {
        await rejectSuggestedAction(getSupabaseMobileClient(), {
          organizationId: userOrganization.organization.id,
          suggestedActionId: action.id,
          userId: user.id,
          note: t('common.reject'),
        });
      }
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.rejected'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    }
  }

  async function ignore(action: SuggestedAction) {
    if (demoMode) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.demoIgnored'));
      return;
    }

    if (!user || !userOrganization) {
      return;
    }

    try {
      if (shouldUseMobileWebApi()) {
        await postWebApi('/api/approvals/ignore', {
          suggestedActionId: action.id,
          note: t('common.ignore'),
        });
      } else {
        await ignoreSuggestedAction(getSupabaseMobileClient(), {
          organizationId: userOrganization.organization.id,
          suggestedActionId: action.id,
          userId: user.id,
          note: t('common.ignore'),
        });
      }
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.demoIgnored'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    }
  }

  async function previewExecution(action: SuggestedAction) {
    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      const preview = buildDemoExecutionPreview(action, [
        t('demo.sandboxCopy'),
        t('safety.approvalIsNotExecution'),
      ], t('approvals.noRecipient'));
      setExecutionPreviews((current) => ({ ...current, [action.id]: preview }));
      setMessage(t('approvals.previewReady'));
      setBusyActionId(null);
      return;
    }

    if (!shouldUseMobileWebApi()) {
      setMessage(t('mobile.errors.webAppUrlMissing'));
      setBusyActionId(null);
      return;
    }

    try {
      const payload = await postWebApi<{ preview?: ExecutionPreview; error?: string }>(
        '/api/execution/preview',
        { suggestedActionId: action.id },
      );

      if (!payload.preview) {
        throw new Error(payload.error ?? t('common.unavailable'));
      }

      setExecutionPreviews((current) => ({ ...current, [action.id]: payload.preview! }));
      setMessage(
        payload.preview.canExecute ? t('approvals.previewReady') : t('approvals.previewBlocked'),
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setBusyActionId(null);
    }
  }

  async function executeFinal(action: SuggestedAction) {
    setBusyActionId(action.id);
    setMessage(null);

    if (demoMode) {
      const confirmed = (confirmationTexts[action.id] ?? '') === 'EXECUTE';
      const preview = buildDemoExecutionPreview(action, [
        t('demo.sandboxCopy'),
        t('safety.approvalIsNotExecution'),
      ], t('approvals.noRecipient'));

      setExecutionPreviews((current) => ({ ...current, [action.id]: preview }));
      setExecutionResults((current) => ({
        ...current,
        [action.id]: {
          status: confirmed ? 'dry_run' : 'blocked',
          dryRun: true,
          message: confirmed ? t('approvals.dryRunComplete') : t('common.typeExecute'),
        },
      }));
      setMessage(confirmed ? t('approvals.dryRunComplete') : t('common.typeExecute'));
      setBusyActionId(null);
      return;
    }

    if (!shouldUseMobileWebApi()) {
      setMessage(t('mobile.errors.webAppUrlMissing'));
      setBusyActionId(null);
      return;
    }

    try {
      const payload = await postWebApi<{
        action?: SuggestedAction;
        preview?: ExecutionPreview;
        status?: string;
        dryRun?: boolean;
        message?: string;
        error?: string;
      }>('/api/execution/execute', {
        suggestedActionId: action.id,
        finalConfirmationText: confirmationTexts[action.id] ?? '',
      });

      if (payload.action) {
        setLiveActions((current) =>
          current.map((item) => (item.id === action.id ? payload.action! : item)),
        );
      }

      if (payload.preview) {
        setExecutionPreviews((current) => ({ ...current, [action.id]: payload.preview! }));
      }

      setExecutionResults((current) => ({
        ...current,
        [action.id]: {
          status: payload.status,
          dryRun: payload.dryRun,
          message: payload.message ?? null,
        },
      }));
      setMessage(payload.message ?? t('common.result'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    } finally {
      setBusyActionId(null);
    }
  }

  async function saveEdit(action: SuggestedAction) {
    if (demoMode && editing?.actionId === action.id) {
      try {
        const draftPayload = buildEditedPayload(action, editing);
        setActions((current) =>
          current.map((item) =>
            item.id === action.id ? { ...item, status: 'edited', draft_payload: draftPayload, updated_at: new Date().toISOString() } : item,
          ),
        );
        setEditing(null);
        setMessage(t('approvals.draftSaved'));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('common.unavailable'));
      }
      return;
    }

    if (!user || !userOrganization || !editing || editing.actionId !== action.id) {
      return;
    }

    try {
      const draftPayload = buildEditedPayload(action, editing);

      if (shouldUseMobileWebApi()) {
        const payload = await postWebApi<{ action?: SuggestedAction }>('/api/approvals/edit', {
          suggestedActionId: action.id,
          draftPayload,
          note: t('approvals.draftSaved'),
        });
        if (payload.action) {
          setActions((current) => current.map((item) => (item.id === action.id ? payload.action! : item)));
        }
      } else {
        const updated = await editSuggestedAction(getSupabaseMobileClient(), {
          organizationId: userOrganization.organization.id,
          suggestedActionId: action.id,
          userId: user.id,
          draftPayload,
          note: t('approvals.draftSaved'),
        });
        setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
      }
      setEditing(null);
      setMessage(t('approvals.draftSaved'));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? translateMobileError(error.message, t)
          : t('common.unavailable'),
      );
    }
  }

  return (
    <SoreyaScreen eyebrow={t('approvals.queue')} title={t('navigation.approvals')}>
      {message ? (
        <Section title={t('common.status')}>
          <DataRow title={t('navigation.approvals')} detail={message} badge={t('common.info')} />
        </Section>
      ) : null}

      <Section title={t('approvals.queue')}>
        {isLoading ? (
          <DataRow title={t('common.loading')} detail={t('approvals.queue')} badge="…" />
        ) : null}
        {actions.length > 0 ? (
          actions.map((action) => {
            const draft = readDraftPayload(action);
            const isEditing = editing?.actionId === action.id;
            const executionPreview = executionPreviews[action.id];
            const executionResult = executionResults[action.id];
            const busy = busyActionId === action.id;

            return (
              <View key={action.id} style={styles.card}>
                <DataRow
                  title={action.title}
                  detail={`${getActionOrigin(action, t)} · ${label('actionTypes', action.action_type)}`}
                  badge={label('approvalStatus', action.status)}
                  badgeTone={action.status === 'approved' ? 'success' : 'warning'}
                />
                <DataRow
                  title={t('approvals.recipient')}
                  detail={readRecipient(action, t)}
                  badge={t('common.review')}
                  badgeTone="neutral"
                />
                <Text style={styles.draftLabel}>{t('approvals.proposedDraft')}</Text>
                {draft.body ? <Text style={styles.draft}>{draft.body}</Text> : <Text style={styles.payload}>{JSON.stringify(action.draft_payload, null, 2)}</Text>}

                {isEditing ? (
                  <View style={styles.editor}>
                    <TextInput
                      multiline
                      onChangeText={(value) => setEditing({ ...editing, value })}
                      style={styles.input}
                      value={editing.value}
                    />
                    <View style={styles.actions}>
                      <ActionButton label={t('common.save')} onPress={() => saveEdit(action)} tone="dark" />
                      <ActionButton label={t('common.cancel')} onPress={() => setEditing(null)} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <ActionButton disabled={action.status === 'approved' || busy} label={t('common.approve')} onPress={() => approve(action)} tone="dark" />
                    <ActionButton disabled={action.status === 'approved' || busy} label={t('common.edit')} onPress={() => setEditing(createEditingState(action))} />
                    <ActionButton disabled={action.status === 'approved' || busy} label={t('common.reject')} onPress={() => reject(action)} />
                    <ActionButton disabled={busy} label={t('common.ignore')} onPress={() => ignore(action)} />
                  </View>
                )}

                {action.status === 'approved' ? (
                  <View style={styles.executionBox}>
                    <Text style={styles.executionTitle}>{label('approvalStatus', action.status)}</Text>
                    <Text style={styles.executionHint}>{t('safety.dryRunExecution')}</Text>
                    <ActionButton disabled={busy} label={t('common.preview')} onPress={() => previewExecution(action)} tone="dark" />

                    {executionPreview ? (
                      <View style={styles.previewBox}>
                        <Text style={styles.previewMeta}>
                          {executionPreview.executionType} · {executionPreview.provider ?? t('common.providerPending')}
                        </Text>
                        <Text style={styles.previewMeta}>
                          {executionPreview.recipient ?? t('approvals.noRecipient')} ·{' '}
                          {executionPreview.dryRun ? 'dry_run' : t('common.realModeRequested')}
                        </Text>
                        {executionPreview.body ? <Text style={styles.draft}>{executionPreview.body}</Text> : null}
                      </View>
                    ) : null}

                    <Text style={styles.executeLabel}>{t('common.typeExecute')}</Text>
                    <TextInput
                      autoCapitalize="characters"
                      onChangeText={(value) =>
                        setConfirmationTexts((current) => ({ ...current, [action.id]: value }))
                      }
                      placeholder="EXECUTE"
                      style={styles.confirmInput}
                      value={confirmationTexts[action.id] ?? ''}
                    />
                    <ActionButton disabled={busy} label={t('common.execute')} onPress={() => executeFinal(action)} tone="dark" />

                    {executionResult?.message ? (
                      <Text style={styles.executionResult}>
                        {t('common.result')}: {executionResult.status ?? t('common.unknown')} · {executionResult.message}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <DataRow title={t('approvals.noPending')} detail={t('approvals.noPendingDetail')} badge="0" />
        )}
      </Section>

      <StatusBadge label={t('systemStatus.approvalFirst')} tone="success" />
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
      style={[styles.button, tone === 'dark' ? styles.darkButton : styles.lightButton, disabled ? styles.disabledButton : null]}>
      <Text style={[styles.buttonText, tone === 'dark' ? styles.darkButtonText : styles.lightButtonText]}>{label}</Text>
    </Pressable>
  );
}

function createEditingState(action: SuggestedAction): EditingState {
  const draft = readDraftPayload(action);

  if (draft.body) {
    return {
      actionId: action.id,
      mode: 'body',
      value: draft.body,
    };
  }

  return {
    actionId: action.id,
    mode: 'payload',
    value: JSON.stringify(action.draft_payload, null, 2),
  };
}

function buildEditedPayload(action: SuggestedAction, editing: EditingState): Json {
  if (editing.mode === 'payload') {
    return JSON.parse(editing.value) as Json;
  }

  const draft = toJsonObject(action.draft_payload);

  return {
    ...draft,
    body: editing.value,
  };
}

function readDraftPayload(action: SuggestedAction) {
  const draft = toJsonObject(action.draft_payload);

  return {
    body: typeof draft.body === 'string' ? draft.body : undefined,
    recipient:
      typeof draft.recipient === 'string'
        ? draft.recipient
        : typeof draft.to === 'string'
          ? draft.to
          : undefined,
    recipientEmail: typeof draft.recipientEmail === 'string' ? draft.recipientEmail : undefined,
    recipientPhone: typeof draft.recipientPhone === 'string' ? draft.recipientPhone : undefined,
  };
}

function readRecipient(action: SuggestedAction, translate: (key: string) => string = () => '') {
  const draft = readDraftPayload(action);
  return draft.recipientPhone ?? draft.recipientEmail ?? draft.recipient ?? translate('approvals.noRecipient');
}

function getActionOrigin(action: SuggestedAction, translate: (key: string) => string) {
  const draft = toJsonObject(action.draft_payload);
  const provider = typeof draft.provider === 'string' ? draft.provider : '';

  if (action.action_type.includes('whatsapp') || provider.includes('whatsapp')) {
    return translate('labels.providers.whatsapp');
  }

  if (action.action_type.includes('calendar') || provider === 'google') {
    return translate('calendar.title');
  }

  if (action.action_type.includes('email') || ['gmail', 'microsoft'].includes(provider)) {
    return translate('labels.providers.email');
  }

  if (action.action_type.includes('_from_call') || action.action_type.includes('call_') || provider === 'quick_call') {
    return translate('quickCall.title');
  }

  return translate('common.appName');
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

const styles = StyleSheet.create({
  card: {
    borderTopColor: '#e8e8e8',
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  draft: {
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    color: '#525252',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    padding: 12,
  },
  draftLabel: {
    color: '#525252',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  payload: {
    color: '#737373',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  editor: {
    gap: 10,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  button: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 42,
    justifyContent: 'center',
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  darkButtonText: {
    color: '#ffffff',
  },
  lightButtonText: {
    color: '#525252',
  },
  executionBox: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  executionTitle: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '800',
  },
  executionHint: {
    color: '#0d9488',
    fontSize: 13,
    lineHeight: 18,
  },
  previewBox: {
    backgroundColor: '#ffffff',
    borderColor: '#d1fae5',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  previewMeta: {
    color: '#525252',
    fontSize: 12,
    lineHeight: 18,
  },
  executeLabel: {
    color: '#171717',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  confirmInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e8e8',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171717',
    fontFamily: 'Courier',
    padding: 10,
  },
  executionResult: {
    color: '#525252',
    fontSize: 12,
    lineHeight: 18,
  },
});
