import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import * as expenseService from '@/services/expense-service';
import * as fuelService from '@/services/fuel-service';
import { useReminders } from '@/hooks/use-reminders';
import { useAuthStore } from '@/stores/auth-store';
import type { UnifiedReminder } from '@/services/reminder-service';
import type { Vehicle } from '@/types/database';

export type HomeDashboardStats = {
  fuelEconomyKmPerLitre: number | null;
  monthExpenseMinor: number;
  currency: string;
  nextReminder: UnifiedReminder | null;
  pendingReminderCount: number;
};

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function computeFuelEconomy(
  entries: Array<{ odometer: number; litres: number; is_full_tank: boolean; entry_date: string }>,
): number | null {
  const fullTanks = [...entries]
    .filter((e) => e.is_full_tank && e.litres > 0)
    .sort((a, b) => a.odometer - b.odometer);

  if (fullTanks.length < 2) {
    // Fallback: last two entries with rising odometer
    const sorted = [...entries]
      .filter((e) => e.litres > 0)
      .sort((a, b) => a.odometer - b.odometer);
    if (sorted.length < 2) return null;
    const prev = sorted[sorted.length - 2]!;
    const last = sorted[sorted.length - 1]!;
    const distance = last.odometer - prev.odometer;
    if (distance <= 0) return null;
    return Math.round((distance / last.litres) * 10) / 10;
  }

  const prev = fullTanks[fullTanks.length - 2]!;
  const last = fullTanks[fullTanks.length - 1]!;
  const distance = last.odometer - prev.odometer;
  if (distance <= 0) return null;
  return Math.round((distance / last.litres) * 10) / 10;
}

export function useHomeDashboard(vehicle: Vehicle | null) {
  const user = useAuthStore((s) => s.user);
  const remindersQuery = useReminders();

  const fuelQuery = useQuery({
    queryKey: queryKeys.fuel(vehicle?.id ?? 'none'),
    queryFn: async () => {
      if (!user || !vehicle) return [];
      const result = await fuelService.listFuelEntries(user.id, vehicle.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(user && vehicle),
  });

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(vehicle?.id ?? 'none'),
    queryFn: async () => {
      if (!user || !vehicle) return [];
      const result = await expenseService.listExpenses(user.id, vehicle.id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(user && vehicle),
  });

  const monthStart = startOfMonthIso();
  const monthExpenseMinor = (expensesQuery.data ?? [])
    .filter((e) => e.expense_date >= monthStart)
    .reduce((sum, e) => sum + e.amount_minor, 0);

  const vehicleReminders = (remindersQuery.data ?? []).filter(
    (r) => !vehicle || !r.vehicleId || r.vehicleId === vehicle.id,
  );
  const pending = vehicleReminders
    .filter((r) => r.status === 'pending' || r.status === 'overdue' || r.status === 'snoozed')
    .sort((a, b) => {
      const aDate = a.dueDate ?? '9999';
      const bDate = b.dueDate ?? '9999';
      return aDate.localeCompare(bDate);
    });

  const stats: HomeDashboardStats = {
    fuelEconomyKmPerLitre: computeFuelEconomy(fuelQuery.data ?? []),
    monthExpenseMinor,
    currency: vehicle?.purchase_currency ?? 'LKR',
    nextReminder: pending[0] ?? null,
    pendingReminderCount: pending.length,
  };

  return {
    stats,
    isLoading: fuelQuery.isLoading || expensesQuery.isLoading,
    refetch: async () => {
      await Promise.all([fuelQuery.refetch(), expensesQuery.refetch(), remindersQuery.refetch()]);
    },
  };
}
