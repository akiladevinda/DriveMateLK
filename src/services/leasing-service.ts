import { differenceInMonths, parseISO } from 'date-fns';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { LeasePaymentCreateInput, LeaseRecordCreateInput } from '@/schemas/leasing';
import type { LeasePayment, LeaseRecord, TablesInsert, TablesUpdate } from '@/types/database';

export type LeasingServiceError = { message: string; code?: string };
export type LeasingResult<T> = { data: T; error: null } | { data: null; error: LeasingServiceError };

function mapError(error: { message: string; code?: string } | null): LeasingServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'leasing_error' };
}

/** Estimate only — not an official settlement figure from the finance provider. */
export function calculateEstimatedRemainingMinor(record: {
  monthly_payment_minor: number;
  remaining_instalments: number | null;
  term_months: number;
  start_date: string;
}): number {
  if (record.remaining_instalments != null) {
    return record.remaining_instalments * record.monthly_payment_minor;
  }

  const monthsElapsed = Math.max(0, differenceInMonths(new Date(), parseISO(record.start_date)));
  const remaining = Math.max(0, record.term_months - monthsElapsed);
  return remaining * record.monthly_payment_minor;
}

export async function listLeaseRecords(
  vehicleId: string,
): Promise<LeasingResult<LeaseRecord[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('lease_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('start_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function getLeaseRecord(
  leaseRecordId: string,
): Promise<LeasingResult<LeaseRecord>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('lease_records')
    .select('*')
    .eq('id', leaseRecordId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  if (!data) {
    return { data: null, error: { message: 'Lease record not found', code: 'not_found' } };
  }
  return { data, error: null };
}

export async function createLeaseRecord(
  userId: string,
  input: LeaseRecordCreateInput,
): Promise<LeasingResult<LeaseRecord>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const estimatedRemainingMinor = calculateEstimatedRemainingMinor({
    monthly_payment_minor: input.monthly_payment_minor,
    remaining_instalments: input.remaining_instalments ?? null,
    term_months: input.term_months,
    start_date: input.start_date,
  });

  const payload: TablesInsert<'lease_records'> = {
    user_id: userId,
    ...input,
    estimated_remaining_minor: estimatedRemainingMinor,
  };

  const { data, error } = await supabase
    .from('lease_records')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create lease record', code: 'create_failed' },
    };
  }

  return { data, error: null };
}

export async function updateLeaseRecord(
  leaseRecordId: string,
  input: Partial<LeaseRecordCreateInput>,
): Promise<LeasingResult<LeaseRecord>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const existing = await getLeaseRecord(leaseRecordId);
  if (!existing.data) return { data: null, error: existing.error! };

  const merged = { ...existing.data, ...input };
  const estimatedRemainingMinor = calculateEstimatedRemainingMinor({
    monthly_payment_minor: merged.monthly_payment_minor,
    remaining_instalments: merged.remaining_instalments,
    term_months: merged.term_months,
    start_date: merged.start_date,
  });

  const payload: TablesUpdate<'lease_records'> = {
    ...input,
    estimated_remaining_minor: estimatedRemainingMinor,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('lease_records')
    .update(payload)
    .eq('id', leaseRecordId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update lease record', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteLeaseRecord(leaseRecordId: string): Promise<LeasingResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase.from('lease_records').delete().eq('id', leaseRecordId);
  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: null, error: null };
}

export async function listLeasePayments(
  leaseRecordId: string,
): Promise<LeasingResult<LeasePayment[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('lease_payments')
    .select('*')
    .eq('lease_record_id', leaseRecordId)
    .order('due_date', { ascending: true });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function createLeasePayment(
  input: LeasePaymentCreateInput,
): Promise<LeasingResult<LeasePayment>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'lease_payments'> = input;

  const { data, error } = await supabase
    .from('lease_payments')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to record payment', code: 'create_failed' },
    };
  }

  return { data, error: null };
}

export async function updateLeasePayment(
  paymentId: string,
  input: Partial<LeasePaymentCreateInput>,
): Promise<LeasingResult<LeasePayment>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesUpdate<'lease_payments'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('lease_payments')
    .update(payload)
    .eq('id', paymentId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update payment', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteLeasePayment(paymentId: string): Promise<LeasingResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase.from('lease_payments').delete().eq('id', paymentId);
  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: null, error: null };
}
