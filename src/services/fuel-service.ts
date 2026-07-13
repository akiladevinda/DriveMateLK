import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { FuelEntryCreateInput, FuelEntryUpdateInput } from '@/schemas/fuel';
import type { FuelEntry, TablesInsert, TablesUpdate } from '@/types/database';

export type FuelServiceError = {
  message: string;
  code?: string;
};

export type FuelResult<T> =
  | { data: T; error: null }
  | { data: null; error: FuelServiceError };

function mapError(error: { message: string; code?: string } | null): FuelServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: error.code ?? 'fuel_error' };
}

export async function listFuelEntries(
  userId: string,
  vehicleId: string,
): Promise<FuelResult<FuelEntry[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('fuel_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .order('entry_date', { ascending: false });

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: data ?? [], error: null };
}

export async function getFuelEntry(
  userId: string,
  fuelEntryId: string,
): Promise<FuelResult<FuelEntry>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('fuel_entries')
    .select('*')
    .eq('id', fuelEntryId)
    .eq('user_id', userId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Fuel entry not found', code: 'not_found' } };
  }

  return { data, error: null };
}

export async function createFuelEntry(
  userId: string,
  input: FuelEntryCreateInput,
): Promise<FuelResult<FuelEntry>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'fuel_entries'> = {
    user_id: userId,
    ...input,
  };

  const { data, error } = await supabase.from('fuel_entries').insert(payload).select('*').single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create fuel entry', code: 'create_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'fuel_entry',
    title: 'Fuel entry added',
    description: `${input.litres}L on ${input.entry_date}`,
    occurred_at: new Date(`${input.entry_date}T12:00:00.000Z`).toISOString(),
    metadata: { litres: input.litres, amount_minor: input.total_amount_minor },
  });

  return { data, error: null };
}

export async function updateFuelEntry(
  userId: string,
  fuelEntryId: string,
  input: FuelEntryUpdateInput,
): Promise<FuelResult<FuelEntry>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesUpdate<'fuel_entries'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('fuel_entries')
    .update(payload)
    .eq('id', fuelEntryId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update fuel entry', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteFuelEntry(
  userId: string,
  fuelEntryId: string,
): Promise<FuelResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase
    .from('fuel_entries')
    .delete()
    .eq('id', fuelEntryId)
    .eq('user_id', userId);

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: null, error: null };
}
