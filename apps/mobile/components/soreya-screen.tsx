import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SoreyaDesign as D } from '@/constants/design';

type ScreenProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
};

type RowProps = {
  title: string;
  detail: string;
  badge?: string;
  badgeTone?: BadgeProps['tone'];
};

export function SoreyaScreen({ title, eyebrow, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.stack}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return <View style={styles.metricGrid}>{children}</View>;
}

export function MetricTile({ label, value, detail }: MetricTileProps) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

export function StatusBadge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      <Text style={[styles.badgeText, badgeTextToneStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function DataRow({ title, detail, badge, badgeTone = 'neutral' }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      {badge ? <StatusBadge label={badge} tone={badgeTone} /> : null}
    </View>
  );
}

export function PrimaryButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const badgeToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: D.surfaceMuted,
    borderColor: D.border,
  },
  success: {
    backgroundColor: D.trustSoft,
    borderColor: D.trustBorder,
  },
  warning: {
    backgroundColor: D.warningSoft,
    borderColor: D.warningBorder,
  },
  danger: {
    backgroundColor: D.dangerSoft,
    borderColor: D.dangerBorder,
  },
  info: {
    backgroundColor: D.infoSoft,
    borderColor: D.infoBorder,
  },
});

const badgeTextToneStyles = StyleSheet.create({
  neutral: {
    color: D.muted,
  },
  success: {
    color: D.trustText,
  },
  warning: {
    color: D.warningText,
  },
  danger: {
    color: D.dangerText,
  },
  info: {
    color: D.infoText,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: D.background,
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  eyebrow: {
    color: D.trust,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: D.foreground,
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  stack: {
    gap: 14,
    marginTop: 20,
  },
  section: {
    backgroundColor: D.surface,
    borderColor: D.border,
    borderRadius: D.radius,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  sectionTitle: {
    color: D.foreground,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  sectionBody: {
    marginTop: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    backgroundColor: D.surface,
    borderColor: D.border,
    borderRadius: D.radiusSm,
    borderWidth: 1,
    minWidth: '47%',
    padding: 14,
  },
  metricLabel: {
    color: D.subtle,
    fontSize: 12,
    fontWeight: '500',
  },
  metricValue: {
    color: D.foreground,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  metricDetail: {
    color: D.subtle,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  row: {
    borderTopColor: D.borderSubtle,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    color: D.foreground,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowDetail: {
    color: D.subtle,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: D.primary,
    borderRadius: D.radiusSm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: D.primaryText,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: D.surface,
    borderColor: D.border,
    borderRadius: D.radiusSm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: D.muted,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
