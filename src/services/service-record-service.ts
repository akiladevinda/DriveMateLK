import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { ServiceRecordCreateInput } from '@/schemas/service';
import { ExpenseCategory } from '@/constants/expenses';
import * as expenseService from '@/services/expense-service';
import type { ServiceRecord, TablesInsert } from '@/types/database';

export type ServiceRecordServiceError = { message: string; code?: string };
export type ServiceRecordResult<T> =
  | { data: T; error: null }
  | { data: null; error: ServiceRecordServiceError };

function mapError(error: { message: string; code?: string } | null): ServiceRecordServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'service_error' };
}

export async function listServiceRecords(
  vehicleId: string,
): Promise<ServiceRecordResult<ServiceRecord[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function getServiceRecord(
  serviceRecordId: string,
): Promise<ServiceRecordResult<ServiceRecord>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .eq('id', serviceRecordId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  if (!data) {
    return { data: null, error: { message: 'Service record not found', code: 'not_found' } };
  }
  return { data, error: null };
}

async function expenseExistsForService(
  userId: string,
  vehicleId: string,
  serviceRecordId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .eq('linked_service_id', serviceRecordId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function createServiceRecord(
  userId: string,
  input: ServiceRecordCreateInput,
  options?: { createExpense?: boolean },
): Promise<ServiceRecordResult<ServiceRecord>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { items, ...recordInput } = input;
  const payload: TablesInsert<'service_records'> = {
    user_id: userId,
    ...recordInput,
  };

  const { data, error } = await supabase
    .from('service_records')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create service record', code: 'create_failed' },
    };
  }

  if (items && items.length > 0) {
    const itemRows = items.map((item) => ({
      service_record_id: data.id,
      ...item,
    }));
    await supabase.from('service_items').insert(itemRows);
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'service_completed',
    title: input.service_type,
    description: input.garage_name ?? 'Service recorded',
    occurred_at: new Date(`${input.service_date}T12:00:00.000Z`).toISOString(),
    metadata: { service_record_id: data.id, total_cost_minor: input.total_cost_minor },
  });

  if (options?.createExpense && input.total_cost_minor > 0) {
    const alreadyLinked = await expenseExistsForService(userId, input.vehicle_id, data.id);
    if (!alreadyLinked) {
      await expenseService.createExpense(userId, {
        vehicle_id: input.vehicle_id,
        category: ExpenseCategory.SERVICE,
        title: input.service_type,
        expense_date: input.service_date,
        amount_minor: input.total_cost_minor,
        currency: input.currency,
        vendor: input.garage_name ?? undefined,
        linked_service_id: data.id,
      });
    }
  }

  return { data, error: null };
}
