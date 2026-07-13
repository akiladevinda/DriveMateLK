import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { fuelEntryCreateSchema, type FuelEntryCreateInput } from '@/schemas/fuel';
import * as fuelService from '@/services/fuel-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateFuelScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const { activeVehicle } = useActiveVehicle();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FuelEntryCreateInput>({
    resolver: createZodResolver(fuelEntryCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      odometer: activeVehicle?.current_odometer ?? 0,
      litres: 0,
      total_amount_minor: 0,
      currency: currencyCode,
      fuel_type: activeVehicle?.fuel_type ?? 'petrol',
      is_full_tank: true,
    },
  });

  useEffect(() => {
    if (activeVehicle) {
      setValue('vehicle_id', activeVehicle.id);
      setValue('odometer', activeVehicle.current_odometer);
      setValue('fuel_type', activeVehicle.fuel_type);
    }
  }, [activeVehicle, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fuelService.createFuelEntry(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.fuel(data.vehicle_id) });
      router.back();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  });

  if (!activeVehicle) {
    return (
      <AppScreen>
        <AppHeader showBack title="Add fuel" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle before logging fuel.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Add fuel" />
      <View style={styles.form}>
        <Controller
          control={control}
          name="entry_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.entry_date?.message}
              label="Date (YYYY-MM-DD)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="odometer"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.odometer?.message}
              keyboardType="number-pad"
              label="Odometer"
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseInt(text, 10) || 0)}
              value={String(value)}
            />
          )}
        />
        <Controller
          control={control}
          name="litres"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.litres?.message}
              keyboardType="decimal-pad"
              label="Litres"
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseFloat(text) || 0)}
              value={value ? String(value) : ''}
            />
          )}
        />
        <Controller
          control={control}
          name="total_amount_minor"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.total_amount_minor?.message}
              keyboardType="decimal-pad"
              label={`Total amount (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => {
                const minor = parseMoneyInput(text);
                onChange(minor ?? 0);
              }}
              value={value ? String(value / 100) : ''}
            />
          )}
        />
        <Controller
          control={control}
          name="fuel_station"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.fuel_station?.message}
              label="Fuel station (optional)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <PrimaryButton label={t('common.save')} loading={loading} onPress={onSubmit} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  error: {
    ...typography.caption,
  },
});
