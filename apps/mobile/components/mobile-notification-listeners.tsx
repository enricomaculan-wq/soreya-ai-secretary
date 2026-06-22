import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { useI18n } from '@/lib/i18n';
import { translateMobileError } from '@/lib/mobile-errors';
import {
  configureSmartwatchNotificationCategories,
  SMARTWATCH_NOTIFICATION_ACTIONS,
} from '@/lib/notifications';
import { getWebAppUrl, postWebApi, shouldUseMobileWebApi } from '@/lib/web-api';
import { SOREYA_DEEP_LINKS } from '@soreya/shared';

export function MobileNotificationListeners() {
  const { user, userOrganization } = useSoreyaAuth();
  const { t } = useI18n();

  useEffect(() => {
    configureSmartwatchNotificationCategories().catch(() => undefined);

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => undefined);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response, { userId: user?.id, organizationId: userOrganization?.organization.id, t });
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void handleNotificationResponse(response, { userId: user?.id, organizationId: userOrganization?.organization.id, t });
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [t, user?.id, userOrganization?.organization.id]);

  return null;
}

async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  context: {
    userId?: string;
    organizationId?: string;
    t: (key: string) => string;
  },
) {
  const actionIdentifier = response.actionIdentifier;
  const data = readNotificationData(response);

  if (
    actionIdentifier === SMARTWATCH_NOTIFICATION_ACTIONS.approve
    || actionIdentifier === SMARTWATCH_NOTIFICATION_ACTIONS.ignore
  ) {
    const handled = await runWatchApprovalAction(actionIdentifier, data, context);

    if (handled) {
      router.push('/(tabs)/approvals');
      return;
    }
  }

  routeDeepLink(readDeepLink(response));
}

async function runWatchApprovalAction(
  actionIdentifier: string,
  data: Record<string, unknown>,
  context: { userId?: string; organizationId?: string; t: (key: string) => string },
): Promise<boolean> {
  if (!shouldUseMobileWebApi() || !getWebAppUrl()) {
    return false;
  }

  const smartwatch = readSmartwatchPayload(data);
  const signedActionTokens = readSignedActionTokens(smartwatch);
  const actionType = actionIdentifier === SMARTWATCH_NOTIFICATION_ACTIONS.approve ? 'quick_approve' : 'quick_ignore';
  const signedActionToken =
    actionType === 'quick_approve'
      ? signedActionTokens.quick_approve ?? readString(smartwatch.signedActionToken)
      : signedActionTokens.quick_ignore ?? null;

  if (!signedActionToken) {
    return false;
  }

  try {
    await postWebApi('/api/notifications/action', {
      actionIdentifier,
      actionType,
      signedActionToken,
      suggestedActionId: readString(data.suggestedActionId) ?? readString(smartwatch.suggestedActionId),
      organizationId: context.organizationId ?? readString(data.organizationId),
      userId: context.userId ?? readString(data.userId),
      deepLink: SOREYA_DEEP_LINKS.approvals,
      smartwatch,
    });
    return true;
  } catch (error) {
    console.warn(
      translateMobileError(error instanceof Error ? error.message : 'request_failed', context.t),
    );
    return false;
  }
}

function readNotificationData(response: Notifications.NotificationResponse) {
  return (response.notification.request.content.data ?? {}) as Record<string, unknown>;
}

function readDeepLink(response: Notifications.NotificationResponse): string | null {
  const data = readNotificationData(response);
  const smartwatch = readSmartwatchPayload(data);

  if (typeof smartwatch.deepLink === 'string') {
    return smartwatch.deepLink;
  }

  return typeof data.deepLink === 'string' ? data.deepLink : null;
}

function readSmartwatchPayload(data: Record<string, unknown>) {
  return data.smartwatch && typeof data.smartwatch === 'object' && !Array.isArray(data.smartwatch)
    ? (data.smartwatch as Record<string, unknown>)
    : {};
}

function readSignedActionTokens(smartwatch: Record<string, unknown>) {
  const tokens = smartwatch.signedActionTokens;

  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) {
    return {} as Record<string, string | undefined>;
  }

  const record = tokens as Record<string, unknown>;

  return {
    quick_approve: readString(record.quick_approve),
    quick_ignore: readString(record.quick_ignore),
  };
}

function routeDeepLink(deepLink: string | null) {
  if (deepLink === SOREYA_DEEP_LINKS.dailySummary) {
    router.push('/(tabs)/daily-summary');
    return;
  }

  if (deepLink === SOREYA_DEEP_LINKS.emergency) {
    router.push('/(tabs)/emergency');
    return;
  }

  if (deepLink === SOREYA_DEEP_LINKS.quickCall) {
    router.push('/(tabs)/quick-call-note');
    return;
  }

  if (deepLink === SOREYA_DEEP_LINKS.approvals) {
    router.push('/(tabs)/approvals');
    return;
  }

  router.push('/(tabs)/approvals');
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
