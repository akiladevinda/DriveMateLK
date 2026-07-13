import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { ExpenseCreateInput, ExpenseUpdateInput } from '@/schemas/expense';
import type { Expense, TablesInsert, TablesUpdate } from '@/types/database';

export type ExpenseServiceError = {
  message: string;
  code?: string;
};

export type ExpenseResult<T> =
  | { data: T; error: null }
  | { data: null; error: ExpenseServiceError };

function mapError(error: { message: string; code?: string } | null): ExpenseServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: error.code ?? 'expense_error' };
}

export async function listExpenses(
  userId: string,
  vehicleId: string,
): Promise<ExpenseResult<Expense[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .order('expense_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: data ?? [], error: null };
}

export async function getExpense(
  userId: string,
  expenseId: string,
): Promise<ExpenseResult<Expense>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .eq('user_id', userId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Expense not found', code: 'not_found' } };
  }

  return { data, error: null };
}

export async function createExpense(
  userId: string,
  input: ExpenseCreateInput,
): Promise<ExpenseResult<Expense>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'expenses'> = {
    user_id: userId,
    ...input,
  };

  const { data, error } = await supabase.from('expenses').insert(payload).select('*').single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create expense', code: 'create_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'expense_added',
    title: input.title,
    description: `${input.category} expense recorded`,
    occurred_at: new Date(`${input.expense_date}T12:00:00.000Z`).toISOString(),
    metadata: { amount_minor: input.amount_minor, category: input.category },
  });

  return { data, error: null };
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  input: ExpenseUpdateInput,
): Promise<ExpenseResult<Expense>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesUpdate<'expenses'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('expenses')
    .update(payload)
    .eq('id', expenseId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update expense', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteExpense(
  userId: string,
  expenseId: string,
): Promise<ExpenseResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', userId);

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: null, error: null };
}
