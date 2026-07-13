import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';

import { AppHeader, AppScreen, FormInput, PrimaryButton } from '@/components/ui';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/constants/expenses';
import { useActiveVehicle } from '@/hooks/use-vehicles';
import { queryKeys } from '@/lib/query-client';
import { useTranslation } from '@/localization';
import { expenseCreateSchema, type ExpenseCreateInput } from '@/schemas/expense';
import * as expenseService from '@/services/expense-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTheme } from '@/theme';
import { spacing, typography } from '@/theme/tokens';
import { getErrorMessage } from '@/utils/errors';
import { createZodResolver } from '@/utils/form';
import { parseMoneyInput } from '@/utils/money';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateExpenseScreen() {
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
  } = useForm<ExpenseCreateInput>({
    resolver: createZodResolver(expenseCreateSchema),
    defaultValues: {
      vehicle_id: activeVehicle?.id ?? '',
      category: ExpenseCategory.OTHER,
      title: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      amount_minor: 0,
      currency: currencyCode,
    },
  });

  useEffect(() => {
    if (activeVehicle) {
      setValue('vehicle_id', activeVehicle.id);
    }
  }, [activeVehicle, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const result = await expenseService.createExpense(user.id, data);
      if (result.error || !result.data) {
        setError(result.error?.message ?? t('common.error'));
        return;
      }
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
        <AppHeader showBack title="Add expense" />
        <Text style={{ color: colors.textSecondary }}>Add a vehicle before logging expenses.</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable>
      <AppHeader showBack subtitle={activeVehicle.registration_number} title="Add expense" />
      <View style={styles.form}>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.title?.message}
              label="Title"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field: { value } }) => (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Category: {EXPENSE_CATEGORY_LABELS[value]}
            </Text>
          )}
        />
        <Controller
          control={control}
          name="expense_date"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.expense_date?.message}
              label="Date (YYYY-MM-DD)"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="amount_minor"
          render={({ field: { onChange, onBlur } }) => (
            <FormInput
              error={errors.amount_minor?.message}
              keyboardType="decimal-pad"
              label={`Amount (${currencyCode})`}
              onBlur={onBlur}
              onChangeText={(text) => {
                const minor = parseMoneyInput(text);
                onChange(minor ?? 0);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="vendor"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormInput
              error={errors.vendor?.message}
              label="Vendor (optional)"
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
  hint: {
    ...typography.caption,
  },
  error: {
    ...typography.caption,
  },
});
