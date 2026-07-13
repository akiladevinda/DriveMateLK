import { Linking, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { AppHeader, AppScreen, EmptyState, PrimaryButton, SecondaryButton } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { getActiveRequest } from '@/services/roadside-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';

export default function RoadsideIndexScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: activeRequest } = useQuery({
    queryKey: queryKeys.roadside(user?.id ?? 'anonymous'),
    queryFn: async () => {
      if (!user) return null;
      const result = await getActiveRequest(user.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(user),
    refetchInterval: 5000,
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('more.roadside')} />
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Request towing, flat tire, battery jump or fuel delivery. Demo dispatch simulates provider status updates.
      </Text>

      {activeRequest ? (
        <View style={[styles.activeBox, { backgroundColor: colors.warningMuted, borderColor: colors.warning }]}>
          <Text style={[styles.activeTitle, { color: colors.textPrimary }]}>Active request</Text>
          <Text style={[styles.activeMeta, { color: colors.textSecondary }]}>
            {activeRequest.request_type.replace(/_/g, ' ')} · {activeRequest.status.replace(/_/g, ' ')}
          </Text>
          <PrimaryButton label="View status" onPress={() => router.push('/roadside/active-request')} />
        </View>
      ) : (
        <EmptyState
          description="No active roadside request. Tap below if you need help on the road."
          icon="help-buoy-outline"
          title="Ready when you need it"
        />
      )}

      <PrimaryButton
        label="Request roadside help"
        onPress={() => router.push('/roadside/request')}
        style={styles.cta}
      />
      <SecondaryButton label="Accident assistant" onPress={() => router.push('/accident')} />
      <SecondaryButton label="Emergency: call 119" onPress={() => Linking.openURL('tel:119')} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    marginBottom: spacing.xl,
  },
  activeBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  activeTitle: {
    ...typography.bodyStrong,
  },
  activeMeta: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  cta: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
