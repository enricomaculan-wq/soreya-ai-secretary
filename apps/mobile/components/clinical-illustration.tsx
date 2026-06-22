import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { SoreyaDesign as D } from '@/constants/design';

export type MobileClinicalIllustrationVariant =
  | 'unified-inbox'
  | 'approvals'
  | 'daily-summary'
  | 'trust-control'
  | 'trust-data'
  | 'trust-setup';

const iconByVariant: Record<MobileClinicalIllustrationVariant, keyof typeof MaterialCommunityIcons.glyphMap> = {
  'unified-inbox': 'inbox-multiple-outline',
  approvals: 'clipboard-check-outline',
  'daily-summary': 'calendar-month-outline',
  'trust-control': 'shield-check-outline',
  'trust-data': 'file-lock-outline',
  'trust-setup': 'timer-sand',
};

type ClinicalIllustrationProps = {
  variant: MobileClinicalIllustrationVariant;
  size?: number;
};

export function ClinicalIllustration({ variant, size = 22 }: ClinicalIllustrationProps) {
  return (
    <View style={styles.frame}>
      <MaterialCommunityIcons color={D.trust} name={iconByVariant[variant]} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: D.trustSoft,
    borderColor: D.trustBorder,
    borderRadius: D.radiusSm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});

export const mobileTrustIllustrations: MobileClinicalIllustrationVariant[] = [
  'trust-control',
  'trust-data',
  'trust-setup',
];
