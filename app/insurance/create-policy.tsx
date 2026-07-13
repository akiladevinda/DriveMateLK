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
import { insurancePolicyCreateSchema, type InsurancePolicyCreateInput } from '@/schemas/insurance';
import * as insuranceService from '@/services/insurance-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';

export default function CreatePolicyScreen() {
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
  } = useForm<InsurancePolicyCreateInput>({
    resolver: createZodResolver(insurancePolicyCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      insurer_name: '',
      policy_number: '',
      coverage_type: '',
      premium_minor: null,
      currency: currencyCode,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      expiry_date: format(new Date(), 'yyyy-MM-dd'),
      contact_phone: '',
      contact_email: '',
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
      const result = await insuranceService.createPolicy(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.insurance(data.vehicle_id) });
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
        <AppHeader showBack title="Create policy" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle first.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Create policy" />
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Record policy details for reminders — not a purchase or renewal transaction.
      </Text>
      <View style={styles.form}>
        <Controller
          control={control}
          name="insurer_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.insurer_name?.message} label="Insurer" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="policy_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.policy_number?.message} label="Policy number" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="coverage_type"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.coverage_type?.message} label="Coverage type" onBlur={onBlur} onChangeText={onChange} value={value ?? ''} />
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
          name="expiry_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.expiry_date?.message} label="Expiry date" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="premium_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.premium_minor?.message}
              keyboardType="decimal-pad"
              label={`Premium (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseMoneyInput(text))}
            />
          )}
        />
        <Controller
          control={control}
          name="contact_phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.contact_phone?.message} label="Contact phone" onBlur={onBlur} onChangeText={onChange} value={value ?? ''} />
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
