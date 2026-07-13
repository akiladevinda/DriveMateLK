import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { VehicleFormFields } from '@/components/forms/VehicleFormFields';
import { AppHeader, AppScreen, LoadingSkeleton, PrimaryButton } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { vehicleCreateSchema, type VehicleCreateInput } from '@/schemas/vehicle';
import * as vehicleService from '@/services/vehicle-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function EditVehicleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: queryKeys.vehicle(vehicleId ?? ''),
    queryFn: async () => {
      if (!user || !vehicleId) throw new Error('Vehicle not found');
      const result = await vehicleService.getVehicle(user.id, vehicleId);
      if (result.error || !result.data) throw new Error(result.error?.message);
      return result.data;
    },
    enabled: Boolean(user && vehicleId),
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VehicleCreateInput>({
    resolver: createZodResolver(vehicleCreateSchema),
  });

  useEffect(() => {
    if (vehicle) {
      reset({
        registration_number: vehicle.registration_number,
        make: vehicle.make,
        model: vehicle.model,
        nickname: vehicle.nickname,
        manufacture_year: vehicle.manufacture_year,
        current_odometer: vehicle.current_odometer,
        vehicle_type: vehicle.vehicle_type,
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        odometer_unit: vehicle.odometer_unit,
        purchase_currency: vehicle.purchase_currency,
        ownership_type: vehicle.ownership_type,
        financing_status: vehicle.financing_status,
        is_primary: vehicle.is_primary,
      });
    }
  }, [vehicle, reset]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user || !vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await vehicleService.updateVehicle(user.id, vehicleId, data);
      if (result.error) {
        setError(result.error.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.vehicles(user.id) });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  if (isLoading) {
    return (
      <AppScreen>
        <AppHeader showBack title={t('common.edit')} />
        <LoadingSkeleton lines={5} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack title={t('common.edit')} />
      <VehicleFormFields compact control={control} errors={errors} setValue={setValue} />
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
