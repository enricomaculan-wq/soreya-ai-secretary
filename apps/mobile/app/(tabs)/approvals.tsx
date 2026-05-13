import {
  approveSuggestedAction,
  editSuggestedAction,
  getSuggestedActions,
  ignoreSuggestedAction,
} from '@soreya/database';
import type { Json, SuggestedAction } from '@soreya/shared';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, Section, SoreyaScreen, StatusBadge } from '@/components/soreya-screen';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';

type EditingState = {
  actionId: string;
  value: string;
  mode: 'body' | 'payload';
};

export default function ApprovalsScreen() {
  const { locale, t, label } = useI18n();
  const { user, userOrganization } = useSoreyaAuth();
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (shouldUseMobileDemoData()) {
      setActions(getMobileDemoData(locale).suggestedActions);
      setMessage(t('demo.description'));
      return;
    }

    if (!hasSupabaseMobileConfig() || !userOrganization) {
      setActions([]);
      return;
    }

    try {
      const rows = await getSuggestedActions(getSupabaseMobileClient(), userOrganization.organization.id, {
        statuses: ['pending_approval', 'edited', 'approved'],
        limit: 20,
      });
      setActions(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.unavailable'));
    }
  }, [locale, t, userOrganization]);

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
    if (shouldUseMobileDemoData()) {
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
      const updated = await approveSuggestedAction(getSupabaseMobileClient(), {
        organizationId: userOrganization.organization.id,
        suggestedActionId: action.id,
        userId: user.id,
        note: 'Approved from mobile approval queue',
      });
      setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
      setMessage(t('approvals.approvedReady'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.unavailable'));
    }
  }

  async function ignore(action: SuggestedAction) {
    if (shouldUseMobileDemoData()) {
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.demoIgnored'));
      return;
    }

    if (!user || !userOrganization) {
      return;
    }

    try {
      await ignoreSuggestedAction(getSupabaseMobileClient(), {
        organizationId: userOrganization.organization.id,
        suggestedActionId: action.id,
        userId: user.id,
        note: 'Ignored from mobile approval queue',
      });
      setActions((current) => current.filter((item) => item.id !== action.id));
      setMessage(t('approvals.demoIgnored'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.unavailable'));
    }
  }

  async function saveEdit(action: SuggestedAction) {
    if (shouldUseMobileDemoData() && editing?.actionId === action.id) {
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
      const updated = await editSuggestedAction(getSupabaseMobileClient(), {
        organizationId: userOrganization.organization.id,
        suggestedActionId: action.id,
        userId: user.id,
        draftPayload: buildEditedPayload(action, editing),
        note: 'Edited from mobile approval queue',
      });
      setActions((current) => current.map((item) => (item.id === action.id ? updated : item)));
      setEditing(null);
      setMessage(t('approvals.draftSaved'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('common.unavailable'));
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
        {actions.length > 0 ? (
          actions.map((action) => {
            const draft = readDraftPayload(action);
            const isEditing = editing?.actionId === action.id;

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
                    <ActionButton disabled={action.status === 'approved'} label={t('common.approve')} onPress={() => approve(action)} tone="dark" />
                    <ActionButton disabled={action.status === 'approved'} label={t('common.edit')} onPress={() => setEditing(createEditingState(action))} />
                    <ActionButton label={t('common.ignore')} onPress={() => ignore(action)} />
                  </View>
                )}
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
    borderTopColor: '#e7e5e4',
    borderTopWidth: 1,
    paddingVertical: 14,
  },
  draft: {
    backgroundColor: '#f5f5f4',
    borderRadius: 8,
    color: '#44403c',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    padding: 12,
  },
  draftLabel: {
    color: '#57534e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  payload: {
    color: '#78716c',
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
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1c1917',
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
    backgroundColor: '#1c1917',
  },
  lightButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
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
    color: '#44403c',
  },
});
