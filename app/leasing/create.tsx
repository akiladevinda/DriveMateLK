import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { leaseRecordCreateSchema, type LeaseRecordCreateInput } from '@/schemas/leasing';
import * as leasingService from '@/services/leasing-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';

export default function CreateLeaseScreen() {
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
  } = useForm<LeaseRecordCreateInput>({
    resolver: createZodResolver(leaseRecordCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      provider_name: '',
      original_price_minor: 0,
      down_payment_minor: 0,
      financed_amount_minor: 0,
      currency: currencyCode,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      term_months: 60,
      monthly_payment_minor: 0,
      interest_rate_percent: null,
      remaining_instalments: null,
      official_settlement_minor: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (activeVehicle) setValue('vehicle_id', activeVehicle.id);
  }, [activeVehicle, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await leasingService.createLeaseRecord(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.leasing(data.vehicle_id) });
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
        <AppHeader showBack title="Create lease record" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle first.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Create lease record" />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Estimated remaining balance is calculated automatically and labelled as an estimate only.
      </Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="provider_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.provider_name?.message} label="Provider" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="start_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.start_date?.message} label="Start date" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="term_months"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.term_months?.message}
              keyboardType="number-pad"
              label="Term (months)"
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseInt(text, 10) || 0)}
              value={String(value)}
            />
          )}
        />
        <Controller
          control={control}
          name="monthly_payment_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.monthly_payment_minor?.message}
              keyboardType="decimal-pad"
              label={`Monthly payment (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseMoneyInput(text) ?? 0)}
            />
          )}
        />
        <Controller
          control={control}
          name="remaining_instalments"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.remaining_instalments?.message}
              keyboardType="number-pad"
              label="Remaining instalments (optional)"
              onBlur={onBlur}
              onChangeText={(text) => onChange(text ? parseInt(text, 10) : null)}
              value={value != null ? String(value) : ''}
            />
          )}
        />
        <Controller
          control={control}
          name="financed_amount_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.financed_amount_minor?.message}
              keyboardType="decimal-pad"
              label={`Financed amount (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseMoneyInput(text) ?? 0)}
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
  hint: {
    ...typography.caption,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  error: {
    ...typography.caption,
  },
});
