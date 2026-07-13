import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ExpenseCard } from '@/components/cards';
import { AppHeader, AppScreen, ErrorState, LoadingSkeleton } from '@/components/ui';
import * as expenseService from '@/services/expense-service';
import { useAuthStore } from '@/stores/auth-store';

export default function ExpenseDetailScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expense', expenseId],
    queryFn: async () => {
      if (!user || !expenseId) throw new Error('Not found');
      const result = await expenseService.getExpense(user.id, expenseId);
      if (result.error || !result.data) throw new Error(result.error?.message);
      return result.data;
    },
    enabled: Boolean(user && expenseId),
  });

  return (
    <AppScreen scrollable>
      <AppHeader showBack title="Expense" />
      {isLoading ? <LoadingSkeleton lines={3} /> : null}
      {isError ? <ErrorState message={error?.message ?? 'Error'} onRetry={() => refetch()} /> : null}
      {data ? (
        <ExpenseCard
          amountMinor={data.amount_minor}
          category={data.category}
          currencyCode={data.currency}
          dateIso={data.expense_date}
          notes={data.notes}
          title={data.title}
        />
      ) : null}
    </AppScreen>
  );
}
