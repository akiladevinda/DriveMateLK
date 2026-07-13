import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { serviceRecordCreateSchema, type ServiceRecordCreateInput } from '@/schemas/service';
import * as serviceRecordService from '@/services/service-record-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';

export default function CreateServiceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const { activeVehicle } = useActiveVehicle();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createExpense, setCreateExpense] = useState(true);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ServiceRecordCreateInput>({
    resolver: createZodResolver(serviceRecordCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      service_date: format(new Date(), 'yyyy-MM-dd'),
      odometer: activeVehicle?.current_odometer ?? 0,
      garage_name: '',
      service_type: '',
      labour_cost_minor: 0,
      parts_cost_minor: 0,
      other_cost_minor: 0,
      total_cost_minor: 0,
      currency: currencyCode,
      notes: '',
    },
  });

  useEffect(() => {
    if (activeVehicle) {
      setValue('vehicle_id', activeVehicle.id);
      setValue('odometer', activeVehicle.current_odometer);
    }
  }, [activeVehicle, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await serviceRecordService.createServiceRecord(user.id, data, { createExpense });
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.services(data.vehicle_id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.expenses(data.vehicle_id) });
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
        <AppHeader showBack title="Create service record" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle first.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Create service record" />
      <View style={styles.form}>
        <Controller
          control={control}
          name="service_type"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.service_type?.message} label="Service type" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="service_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.service_date?.message} label="Service date" onBlur={onBlur} onChangeText={onChange} value={value} />
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
          name="garage_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.garage_name?.message} label="Garage" onBlur={onBlur} onChangeText={onChange} value={value ?? ''} />
          )}
        />
        <Controller
          control={control}
          name="total_cost_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.total_cost_minor?.message}
              keyboardType="decimal-pad"
              label={`Total cost (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseMoneyInput(text) ?? 0)}
            />
          )}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: createExpense }}
          onPress={() => setCreateExpense((v) => !v)}
          style={[styles.toggle, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.textPrimary }}>
            {createExpense ? '☑' : '☐'} Also create expense (skips if already linked)
          </Text>
        </Pressable>
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.notes?.message} label="Notes" multiline onBlur={onBlur} onChangeText={onChange} value={value ?? ''} />
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
  toggle: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
  },
  error: {
    ...typography.caption,
  },
});
