import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { VehicleCreateInput, VehicleOdometerUpdateInput, VehicleUpdateInput } from '@/schemas/vehicle';
import type { TablesInsert, TablesUpdate, Vehicle } from '@/types/database';

export type VehicleServiceError = {
  message: string;
  code?: string;
};

export type VehicleResult<T> =
  | { data: T; error: null }
  | { data: null; error: VehicleServiceError };

function mapError(error: { message: string; code?: string } | null): VehicleServiceError | null {
  if (!error) {
    return null;
  }
  return { message: error.message, code: error.code ?? 'vehicle_error' };
}

export async function listVehicles(userId: string): Promise<VehicleResult<Vehicle[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false });

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: data ?? [], error: null };
}

export async function getVehicle(
  userId: string,
  vehicleId: string,
): Promise<VehicleResult<Vehicle>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('user_id', userId)
    .maybeSingle();

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }
  if (!data) {
    return { data: null, error: { message: 'Vehicle not found', code: 'not_found' } };
  }

  return { data, error: null };
}

export async function createVehicle(
  userId: string,
  input: VehicleCreateInput,
): Promise<VehicleResult<Vehicle>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      data: null,
      error: { message: 'You must be signed in to add a vehicle', code: 'not_authenticated' },
    };
  }
  const ownerId = authData.user.id;
  if (ownerId !== userId) {
    return {
      data: null,
      error: { message: 'Signed-in user does not match vehicle owner', code: 'user_mismatch' },
    };
  }

  const payload = {
    ...input,
    user_id: ownerId,
  };

  // Prefer security-definer RPC (avoids RLS INSERT/RETURNING failures).
  const rpc = await supabase.rpc('create_own_vehicle', { payload });
  if (!rpc.error && rpc.data) {
    return { data: rpc.data as Vehicle, error: null };
  }

  // Fallback: direct insert if RPC not deployed yet.
  if (input.is_primary) {
    await supabase.from('vehicles').update({ is_primary: false }).eq('user_id', ownerId);
  }

  const insertPayload: TablesInsert<'vehicles'> = {
    user_id: ownerId,
    ...input,
  };

  const { data, error } = await supabase
    .from('vehicles')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();

  const mapped = mapError(error ?? rpc.error);
  if (mapped) {
    const isRls = mapped.message.toLowerCase().includes('row-level security');
    return {
      data: null,
      error: {
        message: isRls
          ? 'Database permission error. In Supabase → SQL Editor, run supabase/FIX_VEHICLE_CREATE.sql, then try again.'
          : mapped.message,
        code: mapped.code,
      },
    };
  }
  if (!data) {
    return {
      data: null,
      error: {
        message:
          'Vehicle could not be saved. Run supabase/FIX_VEHICLE_CREATE.sql in the Supabase SQL Editor, then try again.',
        code: 'create_failed',
      },
    };
  }

  return { data, error: null };
}

export async function updateVehicle(
  userId: string,
  vehicleId: string,
  input: VehicleUpdateInput,
): Promise<VehicleResult<Vehicle>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  if (input.is_primary) {
    await supabase.from('vehicles').update({ is_primary: false }).eq('user_id', userId);
  }

  const payload: TablesUpdate<'vehicles'> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('vehicles')
    .update(payload)
    .eq('id', vehicleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update vehicle', code: 'update_failed' },
    };
  }

  return { data, error: null };
}

export async function deleteVehicle(
  userId: string,
  vehicleId: string,
): Promise<VehicleResult<null>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('user_id', userId);

  const mapped = mapError(error);
  if (mapped) {
    return { data: null, error: mapped };
  }

  return { data: null, error: null };
}

export async function updateOdometer(
  userId: string,
  vehicleId: string,
  input: VehicleOdometerUpdateInput,
): Promise<VehicleResult<Vehicle>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update({
      current_odometer: input.current_odometer,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to update odometer', code: 'update_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: vehicleId,
    event_type: 'odometer_updated',
    title: 'Odometer updated',
    description: `Recorded ${input.current_odometer.toLocaleString()} ${data.odometer_unit}`,
    occurred_at: input.recorded_at
      ? new Date(`${input.recorded_at}T12:00:00.000Z`).toISOString()
      : new Date().toISOString(),
    metadata: { odometer: input.current_odometer },
  });

  return { data, error: null };
}
