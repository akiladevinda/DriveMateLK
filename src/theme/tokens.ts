export const brand = {
  navy: '#0D1B2A',
  navySurface: '#1B263B',
  green: '#2EC946',
  greenMuted: '#163D24',
  orange: '#F9A826',
  orangeMuted: '#4A3410',
  offWhite: '#F5F7FA',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const colors = {
  light: {
    background: brand.offWhite,
    surface: brand.white,
    surfaceElevated: brand.white,
    surfaceMuted: '#E8EDF3',
    border: '#D5DEEA',
    borderStrong: '#B7C5D8',
    textPrimary: brand.navy,
    textSecondary: '#4A5A70',
    textMuted: '#7A8A9E',
    textInverse: brand.white,
    onAccent: brand.white,
    accent: brand.green,
    accentMuted: '#D8F8DF',
    accentStrong: '#24B33C',
    success: brand.green,
    successMuted: '#D8F8DF',
    warning: brand.orange,
    warningMuted: '#FFF1D6',
    danger: '#E53935',
    dangerMuted: '#FEE2E2',
    information: '#2F80ED',
    informationMuted: '#DBEAFE',
    overlay: 'rgba(13, 27, 42, 0.55)',
    skeleton: '#E2E8F0',
    tabInactive: '#7A8A9E',
    cardOnDark: brand.offWhite,
  },
  dark: {
    background: brand.navy,
    surface: brand.navySurface,
    surfaceElevated: '#243149',
    surfaceMuted: '#152033',
    border: '#2E3F55',
    borderStrong: '#3E516A',
    textPrimary: brand.offWhite,
    textSecondary: '#B7C2D0',
    textMuted: '#8A97A8',
    textInverse: brand.white,
    onAccent: brand.white,
    accent: brand.green,
    accentMuted: brand.greenMuted,
    accentStrong: '#45D65A',
    success: brand.green,
    successMuted: brand.greenMuted,
    warning: brand.orange,
    warningMuted: brand.orangeMuted,
    danger: '#FF6B6B',
    dangerMuted: '#4A1C1C',
    information: '#5BA3FF',
    informationMuted: '#1A3358',
    overlay: 'rgba(0, 0, 0, 0.65)',
    skeleton: '#1A2740',
    tabInactive: '#8A97A8',
    cardOnDark: brand.offWhite,
  },
} as const;

export type ColorSchemeName = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorSchemeName];

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

export const hitSlop = {
  top: 8,
  bottom: 8,
  left: 8,
  right: 8,
} as const;

export const minTouchTarget = 44;
