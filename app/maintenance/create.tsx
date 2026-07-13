import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { maintenanceScheduleCreateSchema, type MaintenanceScheduleCreateInput } from '@/schemas/maintenance';
import * as maintenanceService from '@/services/maintenance-service';
import { useAuthStore } from '@/stores/auth-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';

export default function CreateMaintenanceScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { activeVehicle } = useActiveVehicle();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceScheduleCreateInput>({
    resolver: createZodResolver(maintenanceScheduleCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      maintenance_type: '',
      due_date: null,
      due_odometer: null,
      priority: 'medium',
      notes: '',
    },
  });

  useEffect(() => {
    if (activeVehicle) {
      setValue('vehicle_id', activeVehicle.id);
      setValue('due_odometer', activeVehicle.current_odometer);
    }
  }, [activeVehicle, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await maintenanceService.createMaintenanceSchedule(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.maintenance(data.vehicle_id) });
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
        <AppHeader showBack title="Create maintenance" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle first.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Create maintenance" />
      <View style={styles.form}>
        <Controller
          control={control}
          name="maintenance_type"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.maintenance_type?.message} label="Maintenance type" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="due_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.due_date?.message}
              label="Due date (YYYY-MM-DD, optional)"
              onBlur={onBlur}
              onChangeText={(text) => onChange(text || null)}
              value={value ?? ''}
            />
          )}
        />
        <Controller
          control={control}
          name="due_odometer"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.due_odometer?.message}
              keyboardType="number-pad"
              label="Due odometer (km)"
              onBlur={onBlur}
              onChangeText={(text) => onChange(text ? parseInt(text, 10) : null)}
              value={value != null ? String(value) : ''}
            />
          )}
        />
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
  error: {
    ...typography.caption,
  },
});
