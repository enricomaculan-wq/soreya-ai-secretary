import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  configureSmartwatchNotificationCategories,
  SMARTWATCH_NOTIFICATION_ACTIONS,
} from '@/lib/notifications';

export function MobileNotificationListeners() {
  const [, setLastNotificationTitle] = useState<string | null>(null);

  useEffect(() => {
    configureSmartwatchNotificationCategories().catch(() => undefined);

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotificationTitle(notification.request.content.title ?? null);
    });
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      setLastNotificationTitle(response.notification.request.content.title ?? null);
      handleNotificationResponse(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return null;
}

function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const actionIdentifier = response.actionIdentifier;

  if (
    actionIdentifier === SMARTWATCH_NOTIFICATION_ACTIONS.approve
    || actionIdentifier === SMARTWATCH_NOTIFICATION_ACTIONS.ignore
  ) {
    router.push('/(tabs)/approvals');
    return;
  }

  routeDeepLink(readDeepLink(response));
}

function readDeepLink(response: Notifications.NotificationResponse): string | null {
  const data = response.notification.request.content.data as Record<string, unknown>;
  const smartwatchPayload = data.smartwatch && typeof data.smartwatch === 'object'
    ? data.smartwatch as Record<string, unknown>
    : null;

  if (typeof smartwatchPayload?.deepLink === 'string') {
    return smartwatchPayload.deepLink;
  }

  return typeof data.deepLink === 'string' ? data.deepLink : null;
}

function routeDeepLink(deepLink: string | null) {
  if (deepLink === 'soreya://daily-summary') {
    router.push('/(tabs)');
    return;
  }

  if (deepLink === 'soreya://emergency') {
    router.push('/(tabs)/emergency');
    return;
  }

  if (deepLink === 'soreya://quick-call') {
    router.push('/(tabs)/quick-call-note');
    return;
  }

  router.push('/(tabs)/approvals');
}
