import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { MockRoadsideProvider } from '@/services/roadside/mock-roadside-provider';
import type {
  RoadsideRequest,
  RoadsideRequestStatus,
  RoadsideRequestType,
  TablesInsert,
  TablesUpdate,
} from '@/types/database';

export type RoadsideServiceError = { message: string; code?: string };
export type RoadsideResult<T> = { data: T; error: null } | { data: null; error: RoadsideServiceError };

export interface RoadsideDispatchProvider {
  createRequest(input: CreateRoadsideInput): Promise<RoadsideResult<RoadsideRequest>>;
  getActiveRequest(userId: string): Promise<RoadsideResult<RoadsideRequest | null>>;
  cancelRequest(userId: string, requestId: string): Promise<RoadsideResult<RoadsideRequest>>;
}

export type CreateRoadsideInput = {
  userId: string;
  vehicleId: string;
  requestType: RoadsideRequestType;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
};

const mockProvider = new MockRoadsideProvider();
const mockStore = new Map<string, RoadsideRequest>();

function mapError(error: { message: string; code?: string } | null): RoadsideServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'roadside_error' };
}

function startMockSimulation(userId: string, requestId: string): void {
  mockProvider.startSimulation(requestId, {
    onStatusChange: async (status: RoadsideRequestStatus) => {
      if (isSupabaseConfigured()) {
        await supabase
          .from('roadside_requests')
          .update({ status, updated_at: new Date().toISOString() } satisfies TablesUpdate<'roadside_requests'>)
          .eq('id', requestId)
          .eq('user_id', userId);
      } else {
        const existing = mockStore.get(requestId);
        if (existing) {
          mockStore.set(requestId, { ...existing, status, updated_at: new Date().toISOString() });
        }
      }
    },
  });
}

async function createSupabaseRequest(input: CreateRoadsideInput): Promise<RoadsideResult<RoadsideRequest>> {
  const payload: TablesInsert<'roadside_requests'> = {
    user_id: input.userId,
    vehicle_id: input.vehicleId,
    request_type: input.requestType,
    status: 'requested',
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase.from('roadside_requests').insert(payload).select('*').single();
  const mapped = mapError(error);
  if (mapped || !data) {
    return { data: null, error: mapped ?? { message: 'Failed to create request', code: 'create_failed' } };
  }

  startMockSimulation(input.userId, data.id);
  return { data, error: null };
}

function createMockRequest(input: CreateRoadsideInput): RoadsideResult<RoadsideRequest> {
  const now = new Date().toISOString();
  const request: RoadsideRequest = {
    id: `mock-${Date.now()}`,
    user_id: input.userId,
    vehicle_id: input.vehicleId,
    provider_id: null,
    request_type: input.requestType,
    status: 'requested',
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address ?? null,
    notes: input.notes ?? null,
    assigned_at: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  mockStore.set(request.id, request);
  startMockSimulation(input.userId, request.id);
  return { data: request, error: null };
}

export async function createRequest(input: CreateRoadsideInput): Promise<RoadsideResult<RoadsideRequest>> {
  if (isSupabaseConfigured()) {
    return createSupabaseRequest(input);
  }
  return createMockRequest(input);
}

export async function getActiveRequest(userId: string): Promise<RoadsideResult<RoadsideRequest | null>> {
  const activeStatuses: RoadsideRequestStatus[] = [
    'requested',
    'assigned',
    'on_the_way',
    'arrived',
    'in_progress',
  ];

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('roadside_requests')
      .select('*')
      .eq('user_id', userId)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const mapped = mapError(error);
    if (mapped) return { data: null, error: mapped };
    return { data: data ?? null, error: null };
  }

  const active = [...mockStore.values()]
    .filter((r) => r.user_id === userId && activeStatuses.includes(r.status))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return { data: active, error: null };
}

export async function cancelRequest(
  userId: string,
  requestId: string,
): Promise<RoadsideResult<RoadsideRequest>> {
  mockProvider.stopSimulation(requestId);
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('roadside_requests')
      .update({ status: 'cancelled', updated_at: now } satisfies TablesUpdate<'roadside_requests'>)
      .eq('id', requestId)
      .eq('user_id', userId)
      .select('*')
      .single();

    const mapped = mapError(error);
    if (mapped || !data) {
      return { data: null, error: mapped ?? { message: 'Failed to cancel request', code: 'cancel_failed' } };
    }
    return { data, error: null };
  }

  const existing = mockStore.get(requestId);
  if (!existing || existing.user_id !== userId) {
    return { data: null, error: { message: 'Request not found', code: 'not_found' } };
  }
  const updated = { ...existing, status: 'cancelled' as const, updated_at: now };
  mockStore.set(requestId, updated);
  return { data: updated, error: null };
}

export function getMockRoadsideProvider(): MockRoadsideProvider {
  return mockProvider;
}

export const roadsideDispatchProvider: RoadsideDispatchProvider = {
  createRequest,
  getActiveRequest,
  cancelRequest,
};
