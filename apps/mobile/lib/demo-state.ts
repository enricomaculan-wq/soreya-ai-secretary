import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSoreyaDemoData,
  resolveLocale,
  type Json,
  type SuggestedAction,
  type SupportedLocale,
} from '@soreya/shared';
import { useCallback, useSyncExternalStore } from 'react';

export const MOBILE_DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY = 'soreya-demo-approvals';

const actionCache: Partial<Record<SupportedLocale, SuggestedAction[]>> = {};
const hydrationPromises: Partial<Record<SupportedLocale, Promise<SuggestedAction[]>>> = {};

type DemoStateListener = () => void;
const listeners = new Set<DemoStateListener>();

export function useDemoSuggestedActions(locale: SupportedLocale) {
  const resolvedLocale = resolveLocale(locale);

  const actions = useSyncExternalStore(
    subscribeDemoState,
    () => readDemoSuggestedActionsSync(resolvedLocale),
    () => getSoreyaDemoData(resolvedLocale).suggestedActions,
  );

  const setActions = useCallback(
    (updater: SuggestedAction[] | ((current: SuggestedAction[]) => SuggestedAction[])) => {
      const current = readDemoSuggestedActionsSync(resolvedLocale);
      const next = typeof updater === 'function' ? updater(current) : updater;
      void writeDemoSuggestedActions(resolvedLocale, next);
    },
    [resolvedLocale],
  );

  return [actions, setActions] as const;
}

export function addDemoSuggestedActions(locale: SupportedLocale, actions: SuggestedAction[]) {
  const resolvedLocale = resolveLocale(locale);
  const current = readDemoSuggestedActionsSync(resolvedLocale);
  const actionIds = new Set(actions.map((action) => action.id));
  const next = [
    ...actions,
    ...current.filter((action) => !actionIds.has(action.id)),
  ];

  void writeDemoSuggestedActions(resolvedLocale, next);
  return next;
}

export function addDemoPlaygroundAction(locale: SupportedLocale, action: SuggestedAction) {
  const resolvedLocale = resolveLocale(locale);
  const current = readDemoSuggestedActionsSync(resolvedLocale);
  const next = [action, ...current.filter((item) => item.id !== action.id)];

  void writeDemoSuggestedActions(resolvedLocale, next);
  void writeDemoPlaygroundApprovals(resolvedLocale, next);
  return next;
}

function subscribeDemoState(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function emitDemoStateChange() {
  listeners.forEach((listener) => listener());
}

function readDemoSuggestedActionsSync(locale: SupportedLocale): SuggestedAction[] {
  const cached = actionCache[locale];

  if (cached) {
    return cached;
  }

  void ensureDemoActionsHydrated(locale);
  return getSoreyaDemoData(locale).suggestedActions;
}

async function ensureDemoActionsHydrated(locale: SupportedLocale) {
  if (actionCache[locale]) {
    return actionCache[locale]!;
  }

  if (!hydrationPromises[locale]) {
    hydrationPromises[locale] = hydrateDemoActions(locale);
  }

  return hydrationPromises[locale]!;
}

async function hydrateDemoActions(locale: SupportedLocale): Promise<SuggestedAction[]> {
  const stored = await readJson<SuggestedAction[]>(storageKey(locale));

  if (Array.isArray(stored)) {
    const merged = mergeDemoPlaygroundApprovals(stored, locale);
    actionCache[locale] = merged;
    emitDemoStateChange();
    return merged;
  }

  const actions = mergeDemoPlaygroundApprovals(getSoreyaDemoData(locale).suggestedActions, locale);
  await writeDemoSuggestedActions(locale, actions);
  return actions;
}

async function writeDemoSuggestedActions(locale: SupportedLocale, actions: SuggestedAction[]) {
  actionCache[locale] = actions;
  await writeJson(storageKey(locale), actions);
  emitDemoStateChange();
}

function mergeDemoPlaygroundApprovals(actions: SuggestedAction[], locale: SupportedLocale) {
  const playgroundActions = readDemoPlaygroundApprovalsSync(locale);

  if (playgroundActions.length === 0) {
    return actions;
  }

  const playgroundIds = new Set(playgroundActions.map((action) => action.id));
  return [
    ...playgroundActions,
    ...actions.filter((action) => !playgroundIds.has(action.id)),
  ];
}

function readDemoPlaygroundApprovalsSync(locale: SupportedLocale) {
  return readDemoSuggestedActionsSync(locale).filter((action) => isDemoPlaygroundAction(action, locale));
}

async function writeDemoPlaygroundApprovals(locale: SupportedLocale, actions: SuggestedAction[]) {
  const playgroundActions = actions.filter((action) => isDemoPlaygroundAction(action, locale));
  const stored = await readJson<SuggestedAction[]>(MOBILE_DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY);
  const existing = Array.isArray(stored) ? stored : [];
  const nextIds = new Set(playgroundActions.map((action) => action.id));
  const next = [
    ...playgroundActions,
    ...existing.filter((action) => !nextIds.has(action.id) && !isDemoPlaygroundAction(action, locale)),
  ];

  await writeJson(MOBILE_DEMO_PLAYGROUND_APPROVALS_STORAGE_KEY, next);
}

function isDemoPlaygroundAction(action: SuggestedAction, locale: SupportedLocale) {
  const payload = toJsonObject(action.draft_payload);
  const payloadLocale = typeof payload.locale === 'string' ? resolveLocale(payload.locale) : locale;
  return (payload.demoPlayground === true || payload.provider === 'demo_playground') && payloadLocale === locale;
}

function storageKey(locale: SupportedLocale) {
  return `soreya.demo.actions.${locale}.v1`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function toJsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
