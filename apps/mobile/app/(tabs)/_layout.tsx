import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SoreyaDesign as D } from '@/constants/design';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/lib/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: -0.2,
        },
        tabBarStyle: {
          backgroundColor: D.surface,
          borderTopColor: D.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-summary"
        options={{
          title: t('navigation.dailySummary'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="sun.max.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: t('navigation.inbox'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="tray.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: t('navigation.approvals'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="checkmark.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: t('navigation.emergency'),
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="exclamationmark.triangle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quick-call-note"
        options={{
          title: t('navigation.quickCall'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="phone.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('navigation.calendar'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
