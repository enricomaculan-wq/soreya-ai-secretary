import { Platform } from 'react-native';

import { SoreyaDesign as D } from '@/constants/design';

export const Colors = {
  light: {
    text: D.foreground,
    background: D.background,
    tint: D.trust,
    icon: D.subtle,
    tabIconDefault: D.subtle,
    tabIconSelected: D.trust,
  },
  dark: {
    text: '#f5f5f5',
    background: D.heroDark,
    tint: D.heroAccent,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: D.heroAccent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
