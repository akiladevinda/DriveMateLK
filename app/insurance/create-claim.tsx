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
import { insuranceClaimCreateSchema, type InsuranceClaimCreateInput } from '@/schemas/insurance';
import * as insuranceService from '@/services/insurance-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';

export default function CreateClaimScreen() {
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
  } = useForm<InsuranceClaimCreateInput>({
    resolver: createZodResolver(insuranceClaimCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      policy_id: null,
      claim_number: '',
      incident_date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      claimed_amount_minor: null,
      currency: currencyCode,
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
      const result = await insuranceService.createClaim(user.id, data, { status: 'draft' });
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.insuranceClaims(data.vehicle_id) });
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
        <AppHeader showBack title="Create claim" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle first.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Create claim" />
      <View style={styles.form}>
        <Controller
          control={control}
          name="incident_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput error={errors.incident_date?.message} label="Incident date" onBlur={onBlur} onChangeText={onChange} value={value} />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.description?.message}
              label="Description"
              multiline
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="claimed_amount_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.claimed_amount_minor?.message}
              keyboardType="decimal-pad"
              label={`Estimated amount (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => onChange(parseMoneyInput(text))}
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
        <PrimaryButton label="Save draft" loading={loading} onPress={onSubmit} />
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
