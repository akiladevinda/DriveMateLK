import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import * as authService from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.deleteAccount();
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.deleteAccount')} />
      <Text style={[styles.warning, { color: colors.danger }]}>
        This permanently deletes your account and associated data. This action cannot be undone.
      </Text>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PrimaryButton
        label={t('more.deleteAccount')}
        loading={loading}
        onPress={handleDelete}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  error: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
});
