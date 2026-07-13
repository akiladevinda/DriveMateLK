import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { InsuranceClaimCreateInput, InsurancePolicyCreateInput } from '@/schemas/insurance';
import type { InsuranceClaim, InsurancePolicy, TablesInsert } from '@/types/database';

export type InsuranceServiceError = { message: string; code?: string };
export type InsuranceResult<T> = { data: T; error: null } | { data: null; error: InsuranceServiceError };

function mapError(error: { message: string; code?: string } | null): InsuranceServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'insurance_error' };
}

export async function listPolicies(
  vehicleId: string,
): Promise<InsuranceResult<InsurancePolicy[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('expiry_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function createPolicy(
  userId: string,
  input: InsurancePolicyCreateInput,
): Promise<InsuranceResult<InsurancePolicy>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'insurance_policies'> = {
    user_id: userId,
    ...input,
  };

  const { data, error } = await supabase
    .from('insurance_policies')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create policy', code: 'create_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'insurance_renewed',
    title: 'Insurance policy recorded',
    description: `${input.insurer_name} · ${input.policy_number}`,
    occurred_at: new Date(`${input.start_date}T12:00:00.000Z`).toISOString(),
    metadata: { policy_id: data.id },
  });

  return { data, error: null };
}

export async function listClaims(
  vehicleId: string,
): Promise<InsuranceResult<InsuranceClaim[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('insurance_claims')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('incident_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function createClaim(
  userId: string,
  input: InsuranceClaimCreateInput,
  options?: { status?: 'draft' | 'submitted' },
): Promise<InsuranceResult<InsuranceClaim>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'insurance_claims'> = {
    user_id: userId,
    status: options?.status ?? 'draft',
    ...input,
  };

  const { data, error } = await supabase
    .from('insurance_claims')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create claim', code: 'create_failed' },
    };
  }

  return { data, error: null };
}
