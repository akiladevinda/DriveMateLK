import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AiSafetyBanner } from '@/components/shared/AiSafetyBanner';
import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { useTranslation } from '@/localization';
import { getAIProvider } from '@/services/ai';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';
import { getErrorMessage } from '@/utils/errors';

export default function AiResaleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { activeVehicle } = useActiveVehicle();
  const [loading, setLoading] = useState(false);
  const [rangeText, setRangeText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAdvice = async () => {
    if (!activeVehicle) {
      setError('Add a vehicle first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const advice = await getAIProvider().generateResaleAdvice({
        vehicleId: activeVehicle.id,
        make: activeVehicle.make,
        model: activeVehicle.model,
        manufactureYear: activeVehicle.manufacture_year,
        mileage: activeVehicle.current_odometer,
        fuelType: activeVehicle.fuel_type,
        transmission: activeVehicle.transmission,
        vehicleType: activeVehicle.vehicle_type,
        condition: 'good',
        serviceHistoryCompleteness: 'partial',
        accidentDisclosed: false,
      });
      setRangeText(
        `Private sale: ${formatMoney(advice.privateSaleRangeMinor.min, advice.currency)} – ${formatMoney(advice.privateSaleRangeMinor.max, advice.currency)}`,
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('ai.resale')} />
      <AiSafetyBanner />
      <PrimaryButton label="Get resale guidance" loading={loading} onPress={getAdvice} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {rangeText ? <Text style={{ color: colors.textPrimary, marginTop: spacing.lg }}>{rangeText}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
});
