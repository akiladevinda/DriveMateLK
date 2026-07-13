import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { AppHeader, AppScreen, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function OnboardingPermissionsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    setLoading(true);
    try {
      const { status: permissionStatus } = await Notifications.requestPermissionsAsync();
      setStatus(permissionStatus);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader title={t('onboarding.permissionsTitle')} />
      <View style={styles.content}>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {t('onboarding.permissionsBody')}
        </Text>
        {status ? (
          <Text style={[styles.status, { color: colors.textPrimary }]}>
            Permission status: {status}
          </Text>
        ) : null}
        <PrimaryButton
          label="Enable notifications"
          loading={loading}
          onPress={requestPermission}
        />
        <SecondaryButton
          label={t('common.skip')}
          onPress={() => router.push('/(onboarding)/add-vehicle')}
        />
        <PrimaryButton
          label={t('common.continue')}
          onPress={() => router.push('/(onboarding)/add-vehicle')}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  body: {
    ...typography.body,
  },
  status: {
    ...typography.caption,
  },
});
