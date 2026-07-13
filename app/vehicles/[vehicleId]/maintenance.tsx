import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
} from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as maintenanceService from '@/services/maintenance-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';

export default function VehicleMaintenanceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  const { data: schedules = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.maintenance(vehicleId ?? ''),
    queryFn: async () => {
      if (!vehicleId) return [];
      const result = await maintenanceService.listMaintenanceSchedules(vehicleId);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(vehicleId && isSupabaseConfigured()),
  });

  const complete = async (scheduleId: string) => {
    if (!user) return;
    await maintenanceService.completeMaintenanceSchedule(user.id, scheduleId);
    await refetch();
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('vehicles.maintenance')} />
      <PrimaryButton label="Add schedule" onPress={() => router.push('/maintenance/create')} />

      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {!isLoading && schedules.length === 0 ? (
        <EmptyState
          description="Track oil changes, filters, and other recurring maintenance."
          icon="construct-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {schedules.map((schedule) => (
          <View
            key={schedule.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{schedule.maintenance_type}</Text>
              <StatusBadge
                label={schedule.status}
                variant={schedule.status === 'overdue' ? 'danger' : 'neutral'}
              />
            </View>
            {schedule.due_date ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                Due {formatDisplayDate(schedule.due_date)}
              </Text>
            ) : null}
            {schedule.due_odometer != null ? (
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                Due at {schedule.due_odometer.toLocaleString('en-LK')} km
              </Text>
            ) : null}
            {schedule.status !== 'completed' ? (
              <SecondaryButton label="Mark complete" onPress={() => void complete(schedule.id)} />
            ) : null}
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.caption,
  },
});
