import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { useSettingsStore } from '@/stores/settings-store';
import {
  getThemeColors,
  resolveColorScheme,
  ThemeContext,
  type ThemeMode,
} from '@/theme';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const systemScheme = useColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);

  const themeValue = useMemo(() => {
    const normalizedSystemScheme =
      systemScheme === 'dark' || systemScheme === 'light' ? systemScheme : null;
    const scheme = resolveColorScheme(themeMode, normalizedSystemScheme);
    return {
      mode: themeMode as ThemeMode,
      scheme,
      colors: getThemeColors(scheme),
    };
  }, [themeMode, systemScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function useHydrateSettings() {
  const hydrate = useCallback(() => {
    // Zustand persist rehydrates automatically; hook reserved for future side effects.
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
