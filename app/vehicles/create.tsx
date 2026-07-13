import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { VehicleFormFields } from '@/components/forms/VehicleFormFields';
import { AppHeader, AppScreen, PrimaryButton } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { vehicleCreateSchema, type VehicleCreateInput } from '@/schemas/vehicle';
import * as vehicleService from '@/services/vehicle-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { useQueryClient } from '@tanstack/react-query';

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
  is_primary: false,
};

export default function CreateVehicleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setActiveVehicleId = useSettingsStore((s) => s.setActiveVehicleId);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VehicleCreateInput>({
    resolver: createZodResolver(vehicleCreateSchema),
    defaultValues,
  });

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles(user.id) });
      router.replace(`/vehicles/${result.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('vehicles.add')} />
      <VehicleFormFields control={control} errors={errors} setValue={setValue} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <PrimaryButton label={t('common.save')} loading={loading} onPress={onSubmit} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
});
