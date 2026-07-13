import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AppSplash } from '@/components/branding/AppSplash';
import { AppProviders } from '@/providers/app-providers';
import { validateClientEnv } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

const MIN_BRANDED_SPLASH_MS = 2000;

SplashScreen.preventAutoHideAsync().catch(() => undefined);

async function hideNativeSplash() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Already hidden.
  }
}

function ConfigErrorScreen({ message, missing }: { message: string; missing: string[] }) {
  const { colors } = useTheme();

  useEffect(() => {
    void hideNativeSplash();
  }, []);

  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[styles.configTitle, { color: colors.danger }]}>Configuration needed</Text>
      <Text style={[styles.configBody, { color: colors.textPrimary }]}>{message}</Text>
      {missing.length > 0 ? (
        <Text style={[styles.configList, { color: colors.textSecondary }]}>
          Missing: {missing.join(', ')}
        </Text>
      ) : null}
      <Text style={[styles.configHint, { color: colors.textMuted }]}>
        Add these to `.env` in the project root, then restart Expo with `npx expo start --clear`.
      </Text>
    </View>
  );
}

function AuthBootstrap({ children }: { children: ReactNode }) {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const initialize = useAuthStore((s) => s.initialize);
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const remaining = Math.max(0, MIN_BRANDED_SPLASH_MS - (Date.now() - startedAt.current));
    const timeout = setTimeout(() => setMinTimeDone(true), remaining);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (imageReady) {
      void hideNativeSplash();
    }
  }, [imageReady]);

  // Safety net if image load stalls.
  useEffect(() => {
    const timeout = setTimeout(() => {
      void hideNativeSplash();
      setMinTimeDone(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  const ready = isInitialized && minTimeDone && imageReady;

  if (!ready) {
    return <AppSplash onImageReady={() => setImageReady(true)} />;
  }

  return children;
}

export default function RootLayout() {
  const envResult = validateClientEnv();
  const showConfigError = __DEV__ && !envResult.ok;

  return (
    <AppProviders>
      {showConfigError && !envResult.ok ? (
        <ConfigErrorScreen
          message={envResult.message}
          missing={envResult.missingRequired}
        />
      ) : (
        <AuthBootstrap>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthBootstrap>
      )}
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  configTitle: {
    ...typography.title,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  configBody: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  configList: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  configHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});
