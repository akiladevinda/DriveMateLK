import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

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
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { isSupabaseConfigured } from '@/lib/env';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import * as insuranceService from '@/services/insurance-service';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

export default function InsuranceHubScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { activeVehicle } = useActiveVehicle();

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: queryKeys.insurance(activeVehicle?.id ?? ''),
    queryFn: async () => {
      if (!activeVehicle) return [];
      const result = await insuranceService.listPolicies(activeVehicle.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(activeVehicle && isSupabaseConfigured()),
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: queryKeys.insuranceClaims(activeVehicle?.id ?? ''),
    queryFn: async () => {
      if (!activeVehicle) return [];
      const result = await insuranceService.listClaims(activeVehicle.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(activeVehicle && isSupabaseConfigured()),
  });

  if (!isSupabaseConfigured()) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Insurance hub" />
        <EmptyState
          description="Connect Supabase to store policies and claims."
          icon="cloud-offline-outline"
          title="Backend not configured"
        />
      </AppScreen>
    );
  }

  if (!activeVehicle) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Insurance hub" />
        <EmptyState
          description="Add a vehicle before managing insurance."
          icon="car-outline"
          title="No vehicle"
        />
      </AppScreen>
    );
  }

  const isLoading = policiesLoading || claimsLoading;

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Insurance hub" />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Store policies and draft claims locally — no live purchasing or insurer submission.
      </Text>

      <View style={styles.actions}>
        <PrimaryButton label="Add policy" onPress={() => router.push('/insurance/create-policy')} />
        <SecondaryButton label="New claim" onPress={() => router.push('/insurance/create-claim')} />
      </View>

      {isLoading ? <LoadingSkeleton lines={4} /> : null}

      <Text style={[styles.section, { color: colors.textPrimary }]}>Policies</Text>
      {policies.length === 0 && !isLoading ? (
        <EmptyState
          description="Record your insurer, policy number, and renewal dates."
          icon="shield-outline"
          title={t('common.empty')}
        />
      ) : null}
      <View style={styles.list}>
        {policies.map((policy) => (
          <View
            key={policy.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{policy.insurer_name}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {policy.policy_number} · expires {formatDisplayDate(policy.expiry_date)}
            </Text>
            {policy.premium_minor != null ? (
              <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                Premium {formatMoney(policy.premium_minor, policy.currency)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: colors.textPrimary }]}>Claims</Text>
      {claims.length === 0 && !isLoading ? (
        <EmptyState
          description="Draft accident or repair claims for your records."
          icon="document-text-outline"
          title={t('common.empty')}
        />
      ) : null}
      <View style={styles.list}>
        {claims.map((claim) => (
          <View
            key={claim.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.claimHeader}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {formatDisplayDate(claim.incident_date)}
              </Text>
              <StatusBadge label={claim.status} variant={claim.status === 'draft' ? 'neutral' : 'info'} />
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={2}>
              {claim.description}
            </Text>
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  section: {
    ...typography.heading,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  list: {
    gap: spacing.md,
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
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
