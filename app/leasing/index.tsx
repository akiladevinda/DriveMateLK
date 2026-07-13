import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  AppHeader,
  AppScreen,
  EmptyState,
  LoadingSkeleton,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { isSupabaseConfigured } from '@/lib/env';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as leasingService from '@/services/leasing-service';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function LeasingHubScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { activeVehicle } = useActiveVehicle();

  const { data: leases = [], isLoading } = useQuery({
    queryKey: queryKeys.leasing(activeVehicle?.id ?? ''),
    queryFn: async () => {
      if (!activeVehicle) return [];
      const result = await leasingService.listLeaseRecords(activeVehicle.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(activeVehicle && isSupabaseConfigured()),
  });

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Leasing hub" />
        <EmptyState
          description="Connect Supabase to track lease agreements and payments."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  if (!activeVehicle) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Leasing hub" />
        <EmptyState description="Add a vehicle before tracking leases." icon="car-outline" title="No vehicle" />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Leasing hub" />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Track finance or lease agreements. Estimated remaining balance is indicative only — not an official settlement.
      </Text>
      <PrimaryButton label="Add lease record" onPress={() => router.push('/leasing/create')} />

      {isLoading ? <LoadingSkeleton lines={3} /> : null}

      {!isLoading && leases.length === 0 ? (
        <EmptyState
          description="Record your provider, monthly payment, and remaining instalments."
          icon="document-outline"
          title={t('common.empty')}
        />
      ) : null}

      <View style={styles.list}>
        {leases.map((lease) => {
          const estimate =
            lease.estimated_remaining_minor ??
            leasingService.calculateEstimatedRemainingMinor(lease);
          return (
            <View
              key={lease.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{lease.provider_name}</Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                Started {formatDisplayDate(lease.start_date)} · {lease.term_months} months
              </Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                Monthly {formatMoney(lease.monthly_payment_minor, lease.currency)}
              </Text>
              <Text style={[styles.estimate, { color: colors.warning }]}>
                Est. remaining: {formatMoney(estimate, lease.currency)} (not official settlement)
              </Text>
              {lease.official_settlement_minor != null ? (
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  Official settlement on file: {formatMoney(lease.official_settlement_minor, lease.currency)}
                </Text>
              ) : null}
              <SecondaryButton label="View payments" onPress={() => undefined} />
            </View>
          );
        })}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.bodyStrong,
  },
  cardMeta: {
    ...typography.caption,
  },
  estimate: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
