import { Appearance } from 'react-native';

export const Colors = {
  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryBg: 'rgba(124, 58, 237, 0.1)',
  primaryBgDark: 'rgba(124, 58, 237, 0.3)',

  // Light mode
  light: {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#171717',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    inputBg: '#FFFFFF',
  },

  // Dark mode
  dark: {
    bg: '#171717',
    surface: '#262626',
    elevated: '#2D2D2D',
    border: '#374151',
    borderLight: 'rgba(255,255,255,0.05)',
    text: '#F5F5F5',
    textSecondary: 'rgba(255,255,255,0.6)',
    textMuted: 'rgba(255,255,255,0.4)',
    inputBg: '#262626',
  },

  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  orange: '#F97316',
  orangeBg: 'rgba(249, 115, 22, 0.1)',
};

export const getTheme = (isDark: boolean) => ({
  isDark,
  colors: isDark ? Colors.dark : Colors.light,
  primary: Colors.primary,
});

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};
