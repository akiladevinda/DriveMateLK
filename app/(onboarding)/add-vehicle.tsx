import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { VehicleFormFields } from '@/components/forms/VehicleFormFields';
import { AppHeader, AppScreen, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useTranslation } from '@/localization';
import { vehicleCreateSchema, type VehicleCreateInput } from '@/schemas/vehicle';
import * as vehicleService from '@/services/vehicle-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';

const defaultValues: VehicleCreateInput = {
  registration_number: '',
  make: '',
  model: '',
  manufacture_year: new Date().getFullYear(),
  vehicle_type: 'car',
  fuel_type: 'petrol',
  transmission: 'manual',
  current_odometer: 0,
  odometer_unit: 'km',
  purchase_currency: 'LKR',
  ownership_type: 'owned',
  financing_status: 'none',
  is_primary: true,
};

export default function OnboardingAddVehicleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setActiveVehicleId = useSettingsStore((s) => s.setActiveVehicleId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleCreateInput>({
    resolver: createZodResolver(vehicleCreateSchema),
    defaultValues,
  });

  const selectedType = watch('vehicle_type');

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vehicleService.createVehicle(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      setActiveVehicleId(result.data.id);
      router.push({
        pathname: '/(onboarding)/complete',
        params: { vehicleType: result.data.vehicle_type },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AppScreen scrollable>
      <AppHeader title={t('onboarding.addVehicleTitle')} />
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {t('onboarding.addVehicleBody')}
      </Text>
      <VehicleFormFields compact control={control} errors={errors} setValue={setValue} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <PrimaryButton label={t('vehicles.add')} loading={loading} onPress={onSubmit} />
        <SecondaryButton
          label={t('common.skip')}
          onPress={() =>
            router.push({
              pathname: '/(onboarding)/complete',
              params: { vehicleType: selectedType || 'car' },
            })
          }
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
});
