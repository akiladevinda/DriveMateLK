import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { colors, type ThemeColors } from './tokens';
import { useSettingsStore } from '@/stores/settings-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export function resolveColorScheme(
  mode: ThemeMode,
  systemScheme: 'light' | 'dark' | null | undefined,
): 'light' | 'dark' {
  if (mode === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

export function getThemeColors(scheme: 'light' | 'dark'): ThemeColors {
  return colors[scheme];
}

export const ThemeContext = createContext<{
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  const systemScheme = useColorScheme();
  const mode = useSettingsStore((state) => state.themeMode);

  if (context) {
    return context;
  }

  const scheme = resolveColorScheme(
    mode,
    systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : 'light',
  );
  return {
    mode,
    scheme,
    colors: getThemeColors(scheme),
  };
}
