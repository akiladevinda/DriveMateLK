import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { parseAuthCallbackUrl } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

/**
 * Handles Supabase email confirmation / recovery deep links.
 * Configure the same redirect URL in Supabase Auth → URL Configuration.
 */
export default function AuthCallbackScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const initialize = useAuthStore((s) => s.initialize);
  const [message, setMessage] = useState('Confirming your account…');

  useEffect(() => {
    let cancelled = false;

    async function handleUrl(url: string | null) {
      if (!url) {
        setMessage('Missing confirmation link.');
        return;
      }

      const { accessToken, refreshToken, errorDescription } = parseAuthCallbackUrl(url);

      if (errorDescription) {
        setMessage(errorDescription);
        return;
      }

      if (!accessToken || !refreshToken) {
        setMessage('This confirmation link is incomplete. Open it from your email on this device.');
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) {
        return;
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      await initialize();
      await refreshProfile();
      router.replace('/');
    }

    void Linking.getInitialURL().then((url) => void handleUrl(url));

    const subscription = Linking.addEventListener('url', (event) => {
      void handleUrl(event.url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [initialize, refreshProfile, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={[styles.message, { color: colors.textPrimary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  message: {
    ...typography.body,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
