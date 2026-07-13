import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { MetricCard } from '@/components/cards';
import {
  AppHeader,
  AppScreen,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/env';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as analyticsService from '@/services/analytics-service';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

export default function VehicleAnalyticsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.analytics(vehicleId ?? ''),
    queryFn: async () => {
      if (!vehicleId) throw new Error('Vehicle not found');
      const result = await analyticsService.getVehicleMonthlySpend(vehicleId, 6);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(vehicleId && isSupabaseConfigured()),
  });

  const maxTotal = Math.max(...(data?.months.map((m) => m.totalMinor) ?? [1]), 1);

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title={t('vehicles.analytics')} />
        <EmptyState
          description="Connect Supabase to view fuel and expense trends."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('vehicles.analytics')} />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Last 6 months of fuel and non-fuel expenses for this vehicle.
      </Text>

      {isLoading ? <LoadingSkeleton lines={4} /> : null}
      {isError ? (
        <ErrorState message={error?.message ?? t('common.error')} onRetry={() => refetch()} />
      ) : null}

      {data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard
              hint="6-month total"
              icon="water-outline"
              label="Fuel spend"
              value={formatMoney(data.totalFuelMinor)}
            />
            <MetricCard
              hint="Excludes fuel category"
              icon="wallet-outline"
              label="Other expenses"
              value={formatMoney(data.totalExpenseMinor)}
            />
          </View>
          <View style={styles.totalCard}>
            <MetricCard
              hint="Combined"
              icon="stats-chart-outline"
              label="Total spend"
              value={formatMoney(data.totalMinor)}
            />
          </View>

          <Text style={[styles.section, { color: colors.textPrimary }]}>Monthly breakdown</Text>
          <View style={styles.chart}>
            {data.months.map((month) => (
              <View key={month.month} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.textMuted }]}>{month.label}</Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${Math.max(4, (month.totalMinor / maxTotal) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                  {formatMoney(month.totalMinor)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {!isLoading && !isError && !data ? (
        <EmptyState
          description="Log fuel and expenses to see monthly trends."
          icon="bar-chart-outline"
          title={t('common.empty')}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  totalCard: {
    marginBottom: spacing.xl,
  },
  section: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  chart: {
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    ...typography.micro,
    width: 72,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barValue: {
    ...typography.micro,
    width: 80,
    textAlign: 'right',
  },
});
