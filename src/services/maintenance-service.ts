import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { MaintenanceScheduleCreateInput } from '@/schemas/maintenance';
import type { TablesInsert, TablesUpdate, VehicleMaintenanceSchedule } from '@/types/database';

export type MaintenanceServiceError = { message: string; code?: string };
export type MaintenanceResult<T> =
  | { data: T; error: null }
  | { data: null; error: MaintenanceServiceError };

function mapError(error: { message: string; code?: string } | null): MaintenanceServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'maintenance_error' };
}

export async function listMaintenanceSchedules(
  vehicleId: string,
): Promise<MaintenanceResult<VehicleMaintenanceSchedule[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('vehicle_maintenance_schedules')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('due_date', { ascending: true, nullsFirst: false });

  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: data ?? [], error: null };
}

export async function createMaintenanceSchedule(
  userId: string,
  input: MaintenanceScheduleCreateInput,
): Promise<MaintenanceResult<VehicleMaintenanceSchedule>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesInsert<'vehicle_maintenance_schedules'> = {
    user_id: userId,
    status: 'pending',
    ...input,
  };

  const { data, error } = await supabase
    .from('vehicle_maintenance_schedules')
    .insert(payload)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to create schedule', code: 'create_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: input.vehicle_id,
    event_type: 'maintenance_due',
    title: input.maintenance_type,
    description: 'Maintenance schedule added',
    occurred_at: input.due_date
      ? new Date(`${input.due_date}T12:00:00.000Z`).toISOString()
      : new Date().toISOString(),
    metadata: { schedule_id: data.id, priority: input.priority },
  });

  return { data, error: null };
}

export async function completeMaintenanceSchedule(
  userId: string,
  scheduleId: string,
): Promise<MaintenanceResult<VehicleMaintenanceSchedule>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const payload: TablesUpdate<'vehicle_maintenance_schedules'> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('vehicle_maintenance_schedules')
    .update(payload)
    .eq('id', scheduleId)
    .eq('user_id', userId)
    .select('*')
    .single();

  const mapped = mapError(error);
  if (mapped || !data) {
    return {
      data: null,
      error: mapped ?? { message: 'Failed to complete schedule', code: 'update_failed' },
    };
  }

  await supabase.from('vehicle_timeline_events').insert({
    user_id: userId,
    vehicle_id: data.vehicle_id,
    event_type: 'service_completed',
    title: data.maintenance_type,
    description: 'Scheduled maintenance marked complete',
    occurred_at: new Date().toISOString(),
    metadata: { schedule_id: data.id },
  });

  return { data, error: null };
}
