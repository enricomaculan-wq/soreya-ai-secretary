import type { ExecutionPreview, ExecutionType, Json, SuggestedAction } from '@soreya/shared';

export function buildDemoExecutionPreview(
  action: SuggestedAction,
  warnings: string[],
  noRecipientLabel: string,
): ExecutionPreview {
  const draft = readDraftPayload(action);
  const draftPayload = toJsonObject(action.draft_payload);

  return {
    suggestedActionId: action.id,
    executionType: mapActionToExecutionType(action),
    provider: 'demo',
    recipient: readRecipient(draft, noRecipientLabel),
    subject: typeof draftPayload.subject === 'string' ? draftPayload.subject : null,
    body: draft.body ?? null,
    calendarChange: null,
    warnings,
    dryRun: true,
    canExecute: action.status === 'approved',
  };
}

function mapActionToExecutionType(action: SuggestedAction): ExecutionType {
  if (action.action_type.includes('whatsapp')) {
    return action.action_type.includes('emergency') || action.action_type.includes('delay')
      ? 'emergency_whatsapp'
      : 'whatsapp_reply';
  }

  if (action.action_type.includes('calendar') || action.action_type === 'callback_reminder') {
    return action.action_type.includes('update')
      ? 'calendar_update'
      : action.action_type.includes('cancel') || action.action_type.includes('delete')
        ? 'calendar_cancel'
        : 'calendar_create';
  }

  if (action.action_type.includes('emergency') || action.action_type.includes('delay')) {
    return 'emergency_email';
  }

  return 'email_reply';
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

function readRecipient(
  draft: ReturnType<typeof readDraftPayload>,
  noRecipientLabel: string,
) {
  return draft.recipientPhone ?? draft.recipientEmail ?? draft.recipient ?? noRecipientLabel;
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
