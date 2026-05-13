import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
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
    backgroundColor: '#f5f5f4',
    borderColor: '#e7e5e4',
  },
  success: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  warning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  danger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
});

const badgeTextToneStyles = StyleSheet.create({
  neutral: {
    color: '#57534e',
  },
  success: {
    color: '#047857',
  },
  warning: {
    color: '#b45309',
  },
  danger: {
    color: '#be123c',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1c1917',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  stack: {
    gap: 16,
    marginTop: 22,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e5e4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  sectionTitle: {
    color: '#1c1917',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e5e4',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: '47%',
    padding: 16,
  },
  metricLabel: {
    color: '#78716c',
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    color: '#1c1917',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  metricDetail: {
    color: '#78716c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    borderTopColor: '#e7e5e4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    color: '#1c1917',
    fontSize: 15,
    fontWeight: '700',
  },
  rowDetail: {
    color: '#78716c',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1c1917',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d6d3d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#44403c',
    fontSize: 15,
    fontWeight: '700',
  },
});
