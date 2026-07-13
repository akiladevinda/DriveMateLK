import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppHeader, AppScreen, LoadingSkeleton, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useVehicles } from '@/hooks/use-vehicles';
import {
  getEntitlementProvider,
  type EntitlementState,
} from '@/services/subscription/entitlements';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { radii, spacing, typography } from '@/theme/tokens';

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const { data: vehicles = [] } = useVehicles();
  const provider = getEntitlementProvider();
  const [localPlan, setLocalPlan] = useState<'free' | 'premium'>('free');

  const { data: entitlements, isLoading, refetch } = useQuery({
    queryKey: ['entitlements', user?.id ?? 'anonymous'],
    queryFn: async () => {
      if (!user) return null;
      return provider.getEntitlements(user.id);
    },
    enabled: Boolean(user),
  });

  const display: EntitlementState | null = entitlements ?? null;
  const vehicleLimitReached = display ? vehicles.length >= display.maxVehicles : false;

  const toggleDemoPlan = () => {
    if (!user) return;
    const next = localPlan === 'free' ? 'premium' : 'free';
    provider.setMockPlan(user.id, next === 'premium' ? 'premium_individual' : 'free');
    setLocalPlan(next);
    void refetch();
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Subscription" />
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Mock entitlements for development. Free plan allows 1 vehicle and limited AI; Premium unlocks multi-vehicle and advanced features.
      </Text>

      {isLoading ? <LoadingSkeleton lines={4} /> : null}

      {display ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.plan, { color: colors.textPrimary }]}>
            {display.isPremium ? 'Premium' : 'Free'} plan
          </Text>
          <FeatureRow colors={colors} label="Vehicles" value={`${vehicles.length} / ${display.maxVehicles}`} />
          <FeatureRow colors={colors} label="AI scans / month" value={String(display.maxAiScansPerMonth)} />
          <FeatureRow colors={colors} label="Document storage" value={`${display.maxDocumentStorageMb} MB`} />
          <FeatureRow colors={colors} label="Family sharing" value={display.familySharingEnabled ? 'Yes' : 'No'} />
          <FeatureRow colors={colors} label="Advanced reports" value={display.advancedReportsEnabled ? 'Yes' : 'No'} />
          {vehicleLimitReached && !display.isPremium ? (
            <Text style={[styles.warning, { color: colors.warning }]}>
              Vehicle limit reached. Upgrade to add more vehicles.
            </Text>
          ) : null}
        </View>
      ) : null}

      <PrimaryButton label="Toggle demo plan (dev)" onPress={toggleDemoPlan} style={styles.toggle} />
      <SecondaryButton label="Refresh" onPress={() => refetch()} />
    </AppScreen>
  );
}

function FeatureRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { textPrimary: string; textSecondary: string };
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  plan: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxs,
  },
  rowLabel: {
    ...typography.caption,
  },
  rowValue: {
    ...typography.label,
  },
  warning: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  toggle: {
    marginBottom: spacing.md,
  },
});
