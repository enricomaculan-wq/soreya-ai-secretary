import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  disableNotificationToken,
  getNotificationTokensForUser,
  upsertNotificationToken,
  type UserOrganization,
} from '@soreya/database';
import type { RegisteredNotificationToken } from '@soreya/shared';
import type { User } from '@supabase/supabase-js';

import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';

export const SMARTWATCH_NOTIFICATION_CATEGORIES = {
  approval: 'SOREYA_APPROVAL',
  open: 'SOREYA_OPEN',
} as const;

export const SMARTWATCH_NOTIFICATION_ACTIONS = {
  approve: 'APPROVE',
  ignore: 'IGNORE',
  open: 'OPEN',
} as const;

export type MobileNotificationState = {
  enabledByEnv: boolean;
  permissionStatus: Notifications.PermissionStatus | 'unknown';
  registeredToken: RegisteredNotificationToken | null;
  expoPushToken: string | null;
};

export const PUSH_NOTIFICATIONS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS !== 'false';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getMobileNotificationState(
  user: User | null,
  userOrganization: UserOrganization | null,
): Promise<MobileNotificationState> {
  const permission = await Notifications.getPermissionsAsync().catch(() => null);

  if (!hasSupabaseMobileConfig() || !user || !userOrganization) {
    return {
      enabledByEnv: PUSH_NOTIFICATIONS_ENABLED,
      permissionStatus: permission?.status ?? 'unknown',
      registeredToken: null,
      expoPushToken: null,
    };
  }

  const tokens = await getNotificationTokensForUser(
    getSupabaseMobileClient(),
    userOrganization.organization.id,
    user.id,
  );
  const registeredToken = tokens[0] ?? null;

  return {
    enabledByEnv: PUSH_NOTIFICATIONS_ENABLED,
    permissionStatus: permission?.status ?? 'unknown',
    registeredToken,
    expoPushToken: registeredToken?.expoPushToken ?? null,
  };
}

export async function registerForPushNotifications(
  user: User,
  userOrganization: UserOrganization,
): Promise<RegisteredNotificationToken> {
  if (!PUSH_NOTIFICATIONS_ENABLED) {
    throw new Error('Push notifications are disabled by EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('soreya-default', {
      name: 'Soreya',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await configureSmartwatchNotificationCategories();

  const currentPermissions = await Notifications.getPermissionsAsync();
  const finalPermissions = currentPermissions.status === 'granted'
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();

  if (finalPermissions.status !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const projectId = readExpoProjectId();
  const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const expoPushToken = tokenResult.data;

  return upsertNotificationToken(getSupabaseMobileClient(), {
    organizationId: userOrganization.organization.id,
    userId: user.id,
    expoPushToken,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    deviceType: Platform.OS === 'web' ? 'web' : 'mobile',
    smartwatchPlatform: 'unknown',
    capabilities: [
      'push_notifications',
      'actionable_notifications',
      'daily_summary_glance',
      'open_mobile_deeplink',
    ],
    deviceName: Constants.deviceName ?? `${Platform.OS} device`,
    appVersion: Constants.expoConfig?.version ?? null,
    metadata: {
      projectId,
      appOwnership: Constants.appOwnership ?? null,
    },
  });
}

export async function configureSmartwatchNotificationCategories(): Promise<void> {
  try {
    await Promise.all([
      Notifications.setNotificationCategoryAsync(SMARTWATCH_NOTIFICATION_CATEGORIES.approval, [
        {
          identifier: SMARTWATCH_NOTIFICATION_ACTIONS.approve,
          buttonTitle: 'Approve',
          options: {
            isAuthenticationRequired: true,
          },
        },
        {
          identifier: SMARTWATCH_NOTIFICATION_ACTIONS.ignore,
          buttonTitle: 'Ignore',
          options: {
            isDestructive: true,
            isAuthenticationRequired: true,
          },
        },
        {
          identifier: SMARTWATCH_NOTIFICATION_ACTIONS.open,
          buttonTitle: 'Open',
          options: {
            opensAppToForeground: true,
          },
        },
      ]),
      Notifications.setNotificationCategoryAsync(SMARTWATCH_NOTIFICATION_CATEGORIES.open, [
        {
          identifier: SMARTWATCH_NOTIFICATION_ACTIONS.open,
          buttonTitle: 'Open',
          options: {
            opensAppToForeground: true,
          },
        },
      ]),
    ]);
  } catch {
    // TODO: validate action category behavior on physical Apple Watch and Wear OS devices.
  }
}

export async function disableRegisteredNotificationToken(tokenId: string): Promise<void> {
  await disableNotificationToken(getSupabaseMobileClient(), tokenId);
}

export async function showLocalTestNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Soreya notification test',
      body: 'Notifications only alert you. They never approve, send messages or modify calendars.',
      categoryIdentifier: SMARTWATCH_NOTIFICATION_CATEGORIES.open,
      data: { type: 'system' },
    },
    trigger: null,
  });
}

export function readExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}
