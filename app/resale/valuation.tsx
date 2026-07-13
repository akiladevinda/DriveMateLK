import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, EmptyState, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { getValuationProvider, VALUATION_DISCLAIMER } from '@/services/valuation';
import type { ValuationEstimate } from '@/services/valuation';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';
import { getErrorMessage } from '@/utils/errors';

export default function ResaleValuationScreen() {
  const { colors } = useTheme();
  const { activeVehicle } = useActiveVehicle();
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<ValuationEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compute = async () => {
    if (!activeVehicle) {
      setError('Add a vehicle first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getValuationProvider().estimate({
        vehicle: activeVehicle,
        condition: 'good',
        serviceRecordCount: 2,
        documentValidRatio: 0.9,
      });
      setEstimate(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!activeVehicle) {
    return (
      <AppScreen scrollable>
        <AppHeader showBack title="Resale valuation" />
        <EmptyState description="Select or add a vehicle to estimate resale value." icon="car-outline" title="No vehicle" />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Resale valuation" />
      <AiSafetyBanner notice={VALUATION_DISCLAIMER} />

      <Text style={[styles.vehicle, { color: colors.textPrimary }]}>
        {activeVehicle.make} {activeVehicle.model} · {activeVehicle.registration_number}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {activeVehicle.manufacture_year} · {activeVehicle.current_odometer.toLocaleString('en-LK')} km
      </Text>

      <PrimaryButton label="Compute estimate" loading={loading} onPress={compute} style={styles.cta} />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {estimate ? (
        <View style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.range, { color: colors.textPrimary }]}>
            Private sale: {formatMoney(estimate.privateSaleMinMinor, estimate.currency)} –{' '}
            {formatMoney(estimate.privateSaleMaxMinor, estimate.currency)}
          </Text>
          <Text style={[styles.range, { color: colors.textSecondary }]}>
            Dealer trade-in: {formatMoney(estimate.dealerMinMinor, estimate.currency)} –{' '}
            {formatMoney(estimate.dealerMaxMinor, estimate.currency)}
          </Text>
          <Text style={[styles.confidence, { color: colors.textMuted }]}>
            Confidence: {estimate.confidence}
          </Text>
          {estimate.positiveFactors.length > 0 ? (
            <FactorList colors={colors} items={estimate.positiveFactors} title="Positive factors" />
          ) : null}
          {estimate.negativeFactors.length > 0 ? (
            <FactorList colors={colors} items={estimate.negativeFactors} title="Negative factors" />
          ) : null}
        </View>
      ) : null}
    </AppScreen>
  );
}

function FactorList({
  title,
  items,
  colors,
}: {
  title: string;
  items: string[];
  colors: { textPrimary: string; textSecondary: string };
}) {
  return (
    <View style={styles.factorBlock}>
      <Text style={[styles.factorTitle, { color: colors.textPrimary }]}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={[styles.factorItem, { color: colors.textSecondary }]}>
          · {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  vehicle: {
    ...typography.bodyStrong,
    marginTop: spacing.lg,
  },
  meta: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  cta: {
    marginTop: spacing.xl,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  result: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  range: {
    ...typography.body,
  },
  confidence: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  factorBlock: {
    marginTop: spacing.md,
    gap: spacing.xxs,
  },
  factorTitle: {
    ...typography.label,
  },
  factorItem: {
    ...typography.caption,
  },
});
