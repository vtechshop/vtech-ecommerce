import { Platform } from 'react-native';

export const colors = {
  // Core
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  secondary: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  white: '#FFFFFF',
  black: '#000000',

  // Primary shades
  primaryLight: '#818CF8',
  primaryLighter: '#C7D2FE',
  primaryLightest: '#EEF2FF',
  primaryDarker: '#3730A3',

  // Secondary shades
  secondaryLight: '#FCD34D',
  secondaryLighter: '#FEF3C7',

  // Accent
  accent: '#EC4899',
  accentLight: '#F9A8D4',

  // Semantic light shades
  successLight: '#D1FAE5',
  errorLight: '#FEE2E2',
  warningLight: '#FEF3C7',
  infoLight: '#DBEAFE',

  // Surface variants
  surfaceElevated: '#FFFFFF',
  surfaceDark: '#F3F4F6',
  overlay: 'rgba(0,0,0,0.5)',
};

export const gradients = {
  primary: ['#4F46E5', '#7C3AED'] as const,
  primarySoft: ['#818CF8', '#4F46E5'] as const,
  secondary: ['#F59E0B', '#F97316'] as const,
  success: ['#10B981', '#059669'] as const,
  info: ['#3B82F6', '#6366F1'] as const,
  sunset: ['#F59E0B', '#EF4444'] as const,
  purple: ['#7C3AED', '#EC4899'] as const,
  dark: ['#1F2937', '#111827'] as const,
  card: ['#FFFFFF', '#F9FAFB'] as const,
};

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
    android: { elevation: 2 },
  })!,
  md: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
    android: { elevation: 4 },
  })!,
  lg: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
    android: { elevation: 8 },
  })!,
  xl: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24 },
    android: { elevation: 12 },
  })!,
  colored: (color: string) => Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    android: { elevation: 6 },
  })!,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
};
