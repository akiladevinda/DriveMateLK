import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    setLoading(true);
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        const requested = await Notifications.requestPermissionsAsync();
        setStatus(requested.status);
        return;
      }
      setStatus(settings.status);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.notifications')} />
      <View style={styles.content}>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Manage renewal and maintenance reminders. Push notifications require device permission.
        </Text>
        {status ? (
          <Text style={[styles.status, { color: colors.textPrimary }]}>Status: {status}</Text>
        ) : null}
        <PrimaryButton label="Check permission" loading={loading} onPress={requestPermission} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    marginTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  body: {
    ...typography.body,
  },
  status: {
    ...typography.caption,
  },
});
