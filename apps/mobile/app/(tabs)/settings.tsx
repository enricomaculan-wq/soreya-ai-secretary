import {
  getCalendarConnectionStatuses,
  getEmailConnectionStatuses,
  getNotificationPreferences,
  getRecentSyncLogs,
  getWhatsAppConnectionStatus,
  updateDeviceCapabilities,
  upsertNotificationPreferences,
} from '@soreya/database';
import type {
  CalendarConnectionStatus,
  DeviceCapability,
  EmailConnectionStatus,
  NotificationPreferences,
  RegisteredNotificationToken,
  SyncLog,
  WhatsAppConnectionStatus,
} from '@soreya/shared';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useSoreyaAuth } from '@/components/mobile-auth-gate';
import { DataRow, Section, SoreyaScreen } from '@/components/soreya-screen';
import {
  disableRegisteredNotificationToken,
  getMobileNotificationState,
  registerForPushNotifications,
  showLocalTestNotification,
  type MobileNotificationState,
} from '@/lib/notifications';
import { getMobileDemoData, shouldUseMobileDemoData } from '@/lib/demo-data';
import { useI18n } from '@/lib/i18n';
import { getSupabaseMobileClient, hasSupabaseMobileConfig } from '@/lib/supabase';

const hasSupabaseConfig = hasSupabaseMobileConfig();

type WatchPreferencesForm = Pick<
  NotificationPreferences,
  | 'watchFriendlyNotificationsEnabled'
  | 'allowQuickApproveFromWatch'
  | 'allowQuickIgnoreFromWatch'
  | 'showDailySummaryOnWatch'
  | 'emergencyShortcutsOnWatch'
>;

const DEFAULT_WATCH_PREFERENCES: WatchPreferencesForm = {
  watchFriendlyNotificationsEnabled: true,
  allowQuickApproveFromWatch: false,
  allowQuickIgnoreFromWatch: false,
  showDailySummaryOnWatch: true,
  emergencyShortcutsOnWatch: false,
};

const watchPreferenceRows: {
  key: keyof WatchPreferencesForm;
  title: string;
  detailKey: string;
}[] = [
  {
    key: 'watchFriendlyNotificationsEnabled',
    title: 'Enable watch-friendly notifications',
    detailKey: 'multiDevice.watchFriendlyDetail',
  },
  {
    key: 'allowQuickApproveFromWatch',
    title: 'Allow quick approve from watch',
    detailKey: 'multiDevice.quickApproveDetail',
  },
  {
    key: 'allowQuickIgnoreFromWatch',
    title: 'Allow quick ignore from watch',
    detailKey: 'multiDevice.quickIgnoreDetail',
  },
  {
    key: 'showDailySummaryOnWatch',
    title: 'Show daily summary on watch',
    detailKey: 'multiDevice.dailySummaryDetail',
  },
  {
    key: 'emergencyShortcutsOnWatch',
    title: 'Emergency shortcuts on watch',
    detailKey: 'multiDevice.emergencyShortcutsDetail',
  },
];

export default function SettingsScreen() {
  const { locale, setLocale, t, label } = useI18n();
  const { signOut, user, userOrganization } = useSoreyaAuth();
  const [calendarStatuses, setCalendarStatuses] = useState<CalendarConnectionStatus[]>([]);
  const [emailStatuses, setEmailStatuses] = useState<EmailConnectionStatus[]>([]);
  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [notificationState, setNotificationState] = useState<MobileNotificationState | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [watchPreferences, setWatchPreferences] = useState<WatchPreferencesForm>(DEFAULT_WATCH_PREFERENCES);
  const [watchMessage, setWatchMessage] = useState<string | null>(null);
  const [savingWatchKey, setSavingWatchKey] = useState<keyof WatchPreferencesForm | null>(null);
  const demoMode = shouldUseMobileDemoData();

  useEffect(() => {
    let isMounted = true;

    async function loadConnectionStatuses() {
      if (shouldUseMobileDemoData()) {
        const demo = getMobileDemoData(locale);
        setCalendarStatuses(demo.calendarStatuses);
        setEmailStatuses(demo.emailStatuses);
        setWhatsAppStatus(demo.whatsappStatus);
        setSyncLogs(demo.syncLogs);
        setSyncMessage(t('demo.description'));
        return;
      }

      if (!hasSupabaseConfig || !userOrganization) {
        setCalendarStatuses([]);
        setEmailStatuses([]);
        setWhatsAppStatus(null);
        return;
      }

      try {
        const supabase = getSupabaseMobileClient();
        const [calendarRows, emailRows, whatsAppRow, syncRows] = await Promise.all([
          getCalendarConnectionStatuses(supabase, userOrganization.organization.id),
          getEmailConnectionStatuses(supabase, userOrganization.organization.id),
          getWhatsAppConnectionStatus(supabase, userOrganization.organization.id),
          getRecentSyncLogs(supabase, userOrganization.organization.id, { limit: 5 }),
        ]);

        if (isMounted) {
          setCalendarStatuses(calendarRows);
          setEmailStatuses(emailRows);
          setWhatsAppStatus(whatsAppRow);
          setSyncLogs(syncRows);
        }
      } catch {
        if (isMounted) {
          setCalendarStatuses([]);
          setEmailStatuses([]);
          setWhatsAppStatus(null);
          setSyncLogs([]);
        }
      }
    }

    loadConnectionStatuses();

    return () => {
      isMounted = false;
    };
  }, [locale, t, userOrganization]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationState() {
      try {
        if (shouldUseMobileDemoData()) {
          setNotificationState(demoNotificationState(locale));
          setNotificationMessage(getMobileDemoData(locale).notificationStatus.message);
          setWatchPreferences(valuesFromWatchPreferences(getMobileDemoData(locale).notificationPreferences));
          setWatchMessage(t('demo.description'));
          return;
        }

        const state = await getMobileNotificationState(user, userOrganization);

        if (isMounted) {
          setNotificationState(state);
        }

        if (hasSupabaseConfig && user && userOrganization) {
          const preferences = await getNotificationPreferences(
            getSupabaseMobileClient(),
            userOrganization.organization.id,
            user.id,
          );

          if (isMounted) {
            setWatchPreferences(valuesFromWatchPreferences(preferences));
          }
        }
      } catch (error) {
        if (isMounted) {
          setNotificationMessage(error instanceof Error ? error.message : 'Unable to load notification state.');
        }
      }
    }

    loadNotificationState();

    return () => {
      isMounted = false;
    };
  }, [locale, t, user, userOrganization]);

  async function registerNotifications() {
    if (shouldUseMobileDemoData()) {
      setNotificationState(demoNotificationState(locale));
      setNotificationMessage(t('notifications.demoTokenRegistered'));
      return;
    }

    if (!user || !userOrganization) {
      setNotificationMessage(t('login.description'));
      return;
    }

    try {
      const token = await registerForPushNotifications(user, userOrganization);
      const state = await getMobileNotificationState(user, userOrganization);
      setNotificationState({ ...state, registeredToken: token, expoPushToken: token.expoPushToken });
      setNotificationMessage(t('notifications.noExecution'));
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Unable to register notifications.');
    }
  }

  async function disableNotificationsLocally() {
    if (shouldUseMobileDemoData()) {
      setNotificationState({ ...demoNotificationState(locale), registeredToken: null, expoPushToken: null });
      setNotificationMessage(t('notifications.demoTokenDisabled'));
      return;
    }

    if (!notificationState?.registeredToken) {
      setNotificationMessage(t('notifications.noTokenRegistered'));
      return;
    }

    try {
      await disableRegisteredNotificationToken(notificationState.registeredToken.id);
      const state = await getMobileNotificationState(user, userOrganization);
      setNotificationState(state);
      setNotificationMessage(t('notifications.noTokenRegistered'));
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Unable to disable notifications.');
    }
  }

  async function sendLocalTestNotification() {
    if (shouldUseMobileDemoData()) {
      setNotificationMessage(t('notifications.localTestPrepared'));
      return;
    }

    try {
      await showLocalTestNotification();
      setNotificationMessage(t('notifications.localTestPrepared'));
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : 'Unable to show test notification.');
    }
  }

  async function saveWatchPreference(key: keyof WatchPreferencesForm, value: boolean) {
    if (!user || !userOrganization) {
      setWatchMessage(t('login.description'));
      return;
    }

    const previousPreferences = watchPreferences;
    const nextPreferences = { ...watchPreferences, [key]: value };
    setWatchPreferences(nextPreferences);
    setSavingWatchKey(key);

    if (shouldUseMobileDemoData()) {
      setWatchMessage(t('safety.smartwatchApprovalIsNotExecution'));
      setSavingWatchKey(null);
      return;
    }

    try {
      const supabase = getSupabaseMobileClient();
      const savedPreferences = await upsertNotificationPreferences(supabase, {
        organizationId: userOrganization.organization.id,
        userId: user.id,
        ...nextPreferences,
      });

      if (notificationState?.registeredToken) {
        await updateDeviceCapabilities(supabase, {
          organizationId: userOrganization.organization.id,
          userId: user.id,
          deviceId: notificationState.registeredToken.id,
          deviceType: 'mobile',
          platform: 'unknown',
          capabilities: capabilitiesFromWatchPreferences(nextPreferences),
        });
        setNotificationState(await getMobileNotificationState(user, userOrganization));
      }

      setWatchPreferences(valuesFromWatchPreferences(savedPreferences));
      setWatchMessage(t('safety.smartwatchApprovalIsNotExecution'));
    } catch (error) {
      setWatchPreferences(previousPreferences);
      setWatchMessage(error instanceof Error ? error.message : 'Unable to save smartwatch preferences.');
    } finally {
      setSavingWatchKey(null);
    }
  }

  function runSyncFromMobile() {
    if (shouldUseMobileDemoData()) {
      setSyncLogs(getMobileDemoData(locale).syncLogs);
      setSyncMessage(t('demo.description'));
      return;
    }

    setSyncMessage(`${t('sync.runFromWeb')} ${t('sync.readOnly')}`);
  }

  return (
    <SoreyaScreen eyebrow={t('settings.workspace')} title={t('navigation.settings')}>
      <Section title={t('settings.language')}>
        <View style={styles.languageRow}>
          <Pressable
            onPress={() => setLocale('it')}
            style={[styles.languageButton, locale === 'it' ? styles.languageButtonActive : null]}>
            <Text style={[styles.languageButtonText, locale === 'it' ? styles.languageButtonTextActive : null]}>
              {t('settings.italian')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLocale('en')}
            style={[styles.languageButton, locale === 'en' ? styles.languageButtonActive : null]}>
            <Text style={[styles.languageButtonText, locale === 'en' ? styles.languageButtonTextActive : null]}>
              {t('settings.english')}
            </Text>
          </Pressable>
        </View>
      </Section>

      <Section title={t('settings.systemStatus')}>
        <DataRow
          title={t('settings.demoData')}
          detail={demoMode ? t('demo.description') : t('demo.realProvidersNext')}
          badge={demoMode ? t('common.demoMode') : t('common.ready')}
          badgeTone={demoMode ? 'neutral' : 'success'}
        />
        <DataRow
          title="Supabase"
          detail="EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY"
          badge={demoMode ? t('common.demoMode') : hasSupabaseConfig ? t('common.ready') : t('common.missing')}
          badgeTone={hasSupabaseConfig || demoMode ? 'success' : 'warning'}
        />
        <DataRow
          title={t('common.dryRunMode')}
          detail={t('safety.dryRunExecution')}
          badge={t('common.safe')}
          badgeTone="success"
        />
        <DataRow
          title={t('systemStatus.approvalFirst')}
          detail={t('safety.approvalFirst')}
          badge={t('common.required')}
          badgeTone="success"
        />
      </Section>

      <Section title={t('settings.account')}>
        <DataRow title="Email" detail={user?.email ?? 'demo@soreya.local'} badge={t('common.ready')} badgeTone="success" />
        <DataRow
          title={t('settings.workspace')}
          detail={userOrganization?.organization.name ?? t('onboarding.title')}
          badge={userOrganization?.membership.role ?? t('common.missing')}
          badgeTone={userOrganization ? 'success' : 'warning'}
        />
        <Pressable style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutText}>{t('common.signOut')}</Text>
        </Pressable>
      </Section>

      <Section title={t('notifications.title')}>
        <DataRow
          title={t('notifications.pushNotifications')}
          detail={t('notifications.noExecution')}
          badge={notificationState?.enabledByEnv === false ? t('notifications.disabledEnv') : t('common.available')}
          badgeTone={notificationState?.enabledByEnv === false ? 'warning' : 'success'}
        />
        <DataRow
          title={t('notifications.permission')}
          detail={t('notifications.devicePermissionStatus')}
          badge={notificationState?.permissionStatus ?? t('common.unknown')}
          badgeTone={notificationState?.permissionStatus === 'granted' ? 'success' : 'warning'}
        />
        <DataRow
          title="Expo push token"
          detail={notificationState?.expoPushToken ? t('notifications.registeredForDevice') : t('notifications.noTokenRegistered')}
          badge={notificationState?.registeredToken ? t('common.registered') : t('common.missing')}
          badgeTone={notificationState?.registeredToken ? 'success' : 'warning'}
        />
        {notificationMessage ? <DataRow title={t('common.status')} detail={notificationMessage} badge={t('common.info')} /> : null}
        <Pressable style={styles.signOutButton} onPress={registerNotifications}>
          <Text style={styles.signOutText}>{t('notifications.register')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={sendLocalTestNotification}>
          <Text style={styles.signOutText}>{t('notifications.test')}</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={disableNotificationsLocally}>
          <Text style={styles.signOutText}>{t('notifications.disable')}</Text>
        </Pressable>
      </Section>

      <Section title={t('multiDevice.title')}>
        <DataRow
          title="Apple Watch / Wear OS"
          detail={t('multiDevice.watchBridge')}
          badge={t('multiDevice.phoneBridge')}
          badgeTone="success"
        />
        <DataRow
          title={t('multiDevice.safety')}
          detail={t('safety.smartwatchApprovalIsNotExecution')}
          badge={t('multiDevice.safeBadge')}
          badgeTone="success"
        />
        {watchPreferenceRows.map((row) => (
          <ToggleRow
            key={row.key}
            title={watchPreferenceLabel(row.key, t)}
            detail={t(row.detailKey)}
            value={watchPreferences[row.key]}
            disabled={savingWatchKey === row.key}
            onValueChange={(value) => saveWatchPreference(row.key, value)}
          />
        ))}
        <DataRow
          title={t('multiDevice.finalConfirmation')}
          detail={t('safety.smartwatchApprovalIsNotExecution')}
          badge={t('multiDevice.finalConfirmationRequired')}
          badgeTone="warning"
        />
        {watchMessage ? <DataRow title={t('common.status')} detail={watchMessage} badge={t('common.info')} /> : null}
      </Section>

      <Section title={t('settings.integrations')}>
        <DataRow
          title="Gmail API"
          detail={emailStatuses.find((status) => status.provider === 'gmail')?.email ?? t('empty.email.next')}
          badge={emailStatuses.find((status) => status.provider === 'gmail')?.connected ? t('common.connected') : t('common.notConnected')}
          badgeTone={emailStatuses.find((status) => status.provider === 'gmail')?.connected ? 'success' : 'warning'}
        />
        <DataRow
          title="Microsoft Outlook Mail"
          detail={emailStatuses.find((status) => status.provider === 'microsoft')?.email ?? t('empty.email.next')}
          badge={emailStatuses.find((status) => status.provider === 'microsoft')?.connected ? t('common.connected') : t('common.notConnected')}
          badgeTone={emailStatuses.find((status) => status.provider === 'microsoft')?.connected ? 'success' : 'warning'}
        />
        <DataRow
          title="Google Calendar API"
          detail={calendarStatuses.find((status) => status.provider === 'google')?.email ?? t('empty.calendar.next')}
          badge={calendarStatuses.find((status) => status.provider === 'google')?.connected ? t('common.connected') : t('common.notConnected')}
          badgeTone={calendarStatuses.find((status) => status.provider === 'google')?.connected ? 'success' : 'warning'}
        />
        <DataRow
          title="Microsoft Outlook Calendar"
          detail={calendarStatuses.find((status) => status.provider === 'microsoft')?.email ?? t('empty.calendar.next')}
          badge={calendarStatuses.find((status) => status.provider === 'microsoft')?.connected ? t('common.connected') : t('common.notConnected')}
          badgeTone={calendarStatuses.find((status) => status.provider === 'microsoft')?.connected ? 'success' : 'warning'}
        />
        <DataRow
          title="WhatsApp Business Cloud API"
          detail={whatsAppStatus?.displayPhoneNumber ?? t('empty.whatsapp.next')}
          badge={whatsAppStatus?.connected ? t('common.connected') : t('common.notConnected')}
          badgeTone={whatsAppStatus?.connected ? 'success' : 'warning'}
        />
      </Section>

      <Section title={t('sync.title')}>
        <DataRow
          title={t('sync.scheduler')}
          detail={t('sync.readOnly')}
          badge={t('common.safe')}
          badgeTone="success"
        />
        <DataRow
          title={t('sync.title')}
          detail={syncLogs[0] ? `${syncLogs[0].provider} · ${syncLogs[0].jobType}` : t('sync.noLogsYet')}
          badge={syncLogs[0]?.status ? label('syncStatus', syncLogs[0].status) : t('common.none')}
          badgeTone={syncLogs[0]?.status === 'failed' ? 'danger' : syncLogs[0] ? 'success' : 'warning'}
        />
        {syncLogs[0]?.errorMessage ? <DataRow title={t('sync.lastError')} detail={syncLogs[0].errorMessage} badge={t('common.unavailable')} badgeTone="danger" /> : null}
        {syncMessage ? <DataRow title={t('common.status')} detail={syncMessage} badge={t('common.info')} /> : null}
        <Pressable style={styles.secondaryButton} onPress={runSyncFromMobile}>
          <Text style={styles.signOutText}>{t('sync.runNow')}</Text>
        </Pressable>
      </Section>

      <Section title={t('settings.rules')}>
        <DataRow title={t('settings.rules')} detail={t('safety.approvalFirst')} badge="0" />
      </Section>
    </SoreyaScreen>
  );
}

function watchPreferenceLabel(key: keyof WatchPreferencesForm, translate: (key: string) => string): string {
  const labels: Record<keyof WatchPreferencesForm, string> = {
    watchFriendlyNotificationsEnabled: translate('multiDevice.enableWatchFriendly'),
    allowQuickApproveFromWatch: translate('multiDevice.allowQuickApprove'),
    allowQuickIgnoreFromWatch: translate('multiDevice.allowQuickIgnore'),
    showDailySummaryOnWatch: translate('multiDevice.showDailySummary'),
    emergencyShortcutsOnWatch: translate('multiDevice.emergencyShortcuts'),
  };

  return labels[key];
}

function ToggleRow({
  title,
  detail,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  detail: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDetail}>{detail}</Text>
      </View>
      <Switch
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d6d3d1', true: '#a7f3d0' }}
        thumbColor={value ? '#047857' : '#f5f5f4'}
      />
    </View>
  );
}

function demoNotificationState(locale: 'it' | 'en'): MobileNotificationState {
  const demoDevice = getMobileDemoData(locale).registeredDevices.find((device) => device.deviceType === 'mobile');
  const registeredToken: RegisteredNotificationToken | null = demoDevice
    ? {
        id: demoDevice.id,
        organizationId: demoDevice.organizationId,
        userId: demoDevice.userId,
        platform: 'ios',
        deviceType: demoDevice.deviceType,
        smartwatchPlatform: demoDevice.platform,
        expoPushToken: demoDevice.pushToken,
        deviceName: demoDevice.deviceName,
        capabilities: demoDevice.capabilities,
        status: demoDevice.status,
        createdAt: demoDevice.createdAt,
        updatedAt: demoDevice.updatedAt,
        lastSeenAt: demoDevice.lastSeenAt,
      }
    : null;

  return {
    enabledByEnv: true,
    permissionStatus: 'granted' as MobileNotificationState['permissionStatus'],
    registeredToken,
    expoPushToken: registeredToken?.expoPushToken ?? null,
  };
}

function valuesFromWatchPreferences(preferences: NotificationPreferences | null): WatchPreferencesForm {
  if (!preferences) {
    return DEFAULT_WATCH_PREFERENCES;
  }

  return {
    watchFriendlyNotificationsEnabled: preferences.watchFriendlyNotificationsEnabled,
    allowQuickApproveFromWatch: preferences.allowQuickApproveFromWatch,
    allowQuickIgnoreFromWatch: preferences.allowQuickIgnoreFromWatch,
    showDailySummaryOnWatch: preferences.showDailySummaryOnWatch,
    emergencyShortcutsOnWatch: preferences.emergencyShortcutsOnWatch,
  };
}

function capabilitiesFromWatchPreferences(preferences: WatchPreferencesForm): DeviceCapability[] {
  const capabilities: DeviceCapability[] = ['push_notifications', 'open_mobile_deeplink'];

  if (!preferences.watchFriendlyNotificationsEnabled) {
    return capabilities;
  }

  capabilities.push('actionable_notifications');

  if (preferences.allowQuickApproveFromWatch) {
    capabilities.push('quick_approve');
  }

  if (preferences.allowQuickIgnoreFromWatch) {
    capabilities.push('quick_ignore');
  }

  if (preferences.showDailySummaryOnWatch) {
    capabilities.push('daily_summary_glance');
  }

  if (preferences.emergencyShortcutsOnWatch) {
    capabilities.push('emergency_shortcuts');
  }

  return capabilities;
}

const styles = StyleSheet.create({
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  signOutText: {
    color: '#44403c',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 46,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  languageButtonActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  languageButtonText: {
    color: '#44403c',
    fontSize: 14,
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: '#047857',
  },
  toggleDetail: {
    color: '#78716c',
    fontSize: 13,
    lineHeight: 18,
  },
  toggleRow: {
    alignItems: 'center',
    borderTopColor: '#e7e5e4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleText: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '700',
  },
});
