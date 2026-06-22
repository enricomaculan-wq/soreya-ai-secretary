import type {
  AIProvider,
  Json,
  QuickCallAnalysis,
  QuickCallIntentType,
  QuickCallResult,
} from '@soreya/shared';

export function readQuickCallAnalysisFromResult(result: QuickCallResult, locale: 'it' | 'en'): QuickCallAnalysis {
  const note = result.callNote;
  const noteAnalysis = note?.analysis;

  if (noteAnalysis && typeof noteAnalysis === 'object' && !Array.isArray(noteAnalysis)) {
    const record = noteAnalysis as Record<string, Json | undefined>;

    return {
      intentType: readIntentType(record.intentType, note?.intentType),
      confidence: typeof record.confidence === 'number' ? record.confidence : note?.confidence ?? 0.85,
      customerName: typeof record.customerName === 'string' ? record.customerName : note?.customerName ?? null,
      customerEmail: typeof record.customerEmail === 'string' ? record.customerEmail : note?.customerEmail ?? null,
      customerPhone: typeof record.customerPhone === 'string' ? record.customerPhone : note?.customerPhone ?? null,
      requestedDateTimeText:
        typeof record.requestedDateTimeText === 'string'
          ? record.requestedDateTimeText
          : note?.requestedDateTimeText ?? null,
      requestedStartsAt: note?.requestedStartsAt ?? null,
      requestedEndsAt: note?.requestedEndsAt ?? null,
      reason: typeof record.reason === 'string' ? record.reason : note?.reason ?? null,
      needsMoreInfo: Boolean(record.needsMoreInfo),
      missingFields: Array.isArray(record.missingFields)
        ? record.missingFields.filter((field): field is string => typeof field === 'string')
        : [],
      extractedConstraints: note?.extractedConstraints ?? {},
      suggestedReplyChannel: 'manual_review',
      suggestedReplyBody: readSuggestedReplyBody(result.suggestedActions),
      priority: 'normal',
      suggestedReplyTone: 'professional',
      safetyNotes: Array.isArray(record.safetyNotes)
        ? record.safetyNotes.filter((note): note is string => typeof note === 'string')
        : result.warnings,
      aiProvider: readAiProvider(readString(record.aiProvider) ?? undefined),
      aiModel: typeof record.aiModel === 'string' ? record.aiModel : null,
      usedFallback: typeof record.usedFallback === 'boolean' ? record.usedFallback : true,
    };
  }

  const draft = readDraftPayload(result.suggestedActions[0]);

  return {
    intentType: note?.intentType ?? 'callback_request',
    confidence: note?.confidence ?? 0.85,
    customerName: note?.customerName ?? readString(draft.customerName) ?? (locale === 'it' ? 'Cliente' : 'Customer'),
    customerEmail: note?.customerEmail ?? null,
    customerPhone: note?.customerPhone ?? null,
    requestedDateTimeText: note?.requestedDateTimeText ?? readString(draft.requestedDateTimeText),
    requestedStartsAt: note?.requestedStartsAt ?? null,
    requestedEndsAt: note?.requestedEndsAt ?? null,
    reason: note?.reason ?? readString(draft.reason),
    needsMoreInfo: false,
    missingFields: [],
    extractedConstraints: note?.extractedConstraints ?? {},
    suggestedReplyChannel: 'manual_review',
    suggestedReplyBody: readSuggestedReplyBody(result.suggestedActions),
    priority: 'normal',
    suggestedReplyTone: 'professional',
    safetyNotes: result.warnings,
    aiProvider: readAiProvider(readString(draft.aiProvider) ?? undefined),
    aiModel: null,
    usedFallback: draft.usedFallback === true,
  };
}

function readSuggestedReplyBody(actions: QuickCallResult['suggestedActions']): string | null {
  for (const action of actions) {
    const payload = readDraftPayload(action);
    if (typeof payload.body === 'string') {
      return payload.body;
    }
  }

  return null;
}

function readDraftPayload(action: QuickCallResult['suggestedActions'][number] | undefined) {
  if (!action || !('draft_payload' in action)) {
    return {} as Record<string, Json | undefined>;
  }

  const payload = action.draft_payload;

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, Json | undefined>)
    : {};
}

function readString(value: Json | undefined) {
  return typeof value === 'string' ? value : null;
}

function readIntentType(
  value: Json | undefined,
  fallback?: QuickCallIntentType | null,
): QuickCallIntentType {
  if (typeof value === 'string') {
    return value as QuickCallIntentType;
  }

  return fallback ?? 'unknown';
}

function readAiProvider(value: string | undefined): AIProvider {
  if (value === 'openai' || value === 'heuristic') {
    return value;
  }

  return 'heuristic';
}
