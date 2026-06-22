import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SoreyaDesign as D } from '@/constants/design';

type AuthCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children: ReactNode;
};

export function AuthCard({ eyebrow, title, description, badge, children }: AuthCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

export function AuthNotice({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'trust' }) {
  return <View style={[styles.notice, noticeToneStyles[tone]]}>{children}</View>;
}

export function AuthNoticeText({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' | 'trust' }) {
  return <Text style={[styles.noticeText, noticeTextToneStyles[tone]]}>{children}</Text>;
}

export const authFieldStyles = StyleSheet.create({
  input: {
    backgroundColor: D.surface,
    borderColor: D.border,
    borderRadius: D.radiusSm,
    borderWidth: 1,
    color: D.foreground,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  label: {
    color: D.muted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: D.primary,
    borderRadius: D.radiusSm,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: D.primaryText,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  secondaryLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryLinkText: {
    color: D.trust,
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.45,
  },
  form: {
    gap: 12,
    marginTop: 20,
  },
  messageBox: {
    backgroundColor: D.surfaceMuted,
    borderColor: D.border,
    borderRadius: D.radiusSm,
    borderWidth: 1,
    padding: 12,
  },
  messageText: {
    color: D.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export const authScreenStyles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: D.background,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: D.muted,
    fontSize: 14,
    fontWeight: '500',
  },
});

const noticeToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: D.surfaceMuted,
    borderColor: D.border,
  },
  warning: {
    backgroundColor: D.warningSoft,
    borderColor: D.warningBorder,
  },
  trust: {
    backgroundColor: D.trustSoft,
    borderColor: D.trustBorder,
  },
});

const noticeTextToneStyles = StyleSheet.create({
  neutral: {
    color: D.muted,
  },
  warning: {
    color: D.warningText,
  },
  trust: {
    color: D.trustText,
  },
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: D.warningSoft,
    borderColor: D.warningBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: D.warningText,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: D.surface,
    borderColor: D.border,
    borderRadius: D.radius,
    borderWidth: 1,
    maxWidth: 440,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    width: '100%',
  },
  description: {
    color: D.subtle,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  eyebrow: {
    color: D.trust,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notice: {
    borderRadius: D.radiusSm,
    borderWidth: 1,
    marginTop: 16,
    padding: 12,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: D.foreground,
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.8,
    lineHeight: 36,
    marginTop: 10,
  },
});
