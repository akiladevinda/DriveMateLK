import { format, parseISO, startOfMonth, subMonths } from 'date-fns';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { sumMinor } from '@/utils/money';

export type AnalyticsServiceError = { message: string; code?: string };
export type AnalyticsResult<T> = { data: T; error: null } | { data: null; error: AnalyticsServiceError };

export type MonthlyVehicleSpend = {
  month: string;
  label: string;
  fuelMinor: number;
  expenseMinor: number;
  totalMinor: number;
};

export type VehicleAnalyticsSummary = {
  months: MonthlyVehicleSpend[];
  totalFuelMinor: number;
  totalExpenseMinor: number;
  totalMinor: number;
  monthCount: number;
};

function mapError(error: { message: string; code?: string } | null): AnalyticsServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'analytics_error' };
}

export async function getVehicleMonthlySpend(
  vehicleId: string,
  monthCount = 6,
): Promise<AnalyticsResult<VehicleAnalyticsSummary>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const startMonth = startOfMonth(subMonths(new Date(), monthCount - 1));
  const startDate = format(startMonth, 'yyyy-MM-dd');

  const [fuelRes, expenseRes] = await Promise.all([
    supabase
      .from('fuel_entries')
      .select('entry_date,total_amount_minor')
      .eq('vehicle_id', vehicleId)
      .gte('entry_date', startDate),
    supabase
      .from('expenses')
      .select('expense_date,amount_minor,category')
      .eq('vehicle_id', vehicleId)
      .gte('expense_date', startDate),
  ]);

  const fuelError = mapError(fuelRes.error);
  if (fuelError) return { data: null, error: fuelError };
  const expenseError = mapError(expenseRes.error);
  if (expenseError) return { data: null, error: expenseError };

  const monthKeys: string[] = [];
  for (let i = monthCount - 1; i >= 0; i -= 1) {
    monthKeys.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM'));
  }

  const fuelByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  const expenseByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));

  for (const entry of fuelRes.data ?? []) {
    const key = entry.entry_date.slice(0, 7);
    if (key in fuelByMonth) {
      fuelByMonth[key] = (fuelByMonth[key] ?? 0) + Number(entry.total_amount_minor ?? 0);
    }
  }

  for (const expense of expenseRes.data ?? []) {
    if (expense.category === 'fuel') continue;
    const key = expense.expense_date.slice(0, 7);
    if (key in expenseByMonth) {
      expenseByMonth[key] = (expenseByMonth[key] ?? 0) + Number(expense.amount_minor ?? 0);
    }
  }

  const months: MonthlyVehicleSpend[] = monthKeys.map((month) => {
    const fuelMinor = fuelByMonth[month] ?? 0;
    const expenseMinor = expenseByMonth[month] ?? 0;
    return {
      month,
      label: format(parseISO(`${month}-01`), 'MMM yyyy'),
      fuelMinor,
      expenseMinor,
      totalMinor: fuelMinor + expenseMinor,
    };
  });

  const totalFuelMinor = sumMinor(...months.map((m) => m.fuelMinor));
  const totalExpenseMinor = sumMinor(...months.map((m) => m.expenseMinor));

  return {
    data: {
      months,
      totalFuelMinor,
      totalExpenseMinor,
      totalMinor: totalFuelMinor + totalExpenseMinor,
      monthCount,
    },
    error: null,
  };
}
