import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { Garage } from '@/types/database';
import { haversineDistanceKm } from '@/utils/geo';

export type GarageServiceError = { message: string; code?: string };
export type GarageResult<T> = { data: T; error: null } | { data: null; error: GarageServiceError };

export type GarageLocationFields = {
  address: string | null;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type GarageWithFavorite = Garage &
  GarageLocationFields & {
    isFavorite: boolean;
  };

export type NearbyGarage = GarageWithFavorite & {
  distanceKm: number;
  source: 'drivemate' | 'google_places';
};

export type GarageFilters = {
  district?: string;
  search?: string;
};

type GarageLocationJoin = {
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  is_primary: boolean;
};

type GarageQueryRow = Garage & {
  garage_locations?: GarageLocationJoin[] | null;
};

function mapError(error: { message: string; code?: string } | null): GarageServiceError | null {
  if (!error) return null;
  return { message: error.message, code: error.code ?? 'garage_error' };
}

function pickPrimaryLocation(locations: GarageLocationJoin[] | null | undefined): GarageLocationFields {
  if (!locations?.length) {
    return { address: null, district: null, latitude: null, longitude: null };
  }
  const primary = locations.find((l) => l.is_primary) ?? locations[0];
  return {
    address: primary.address,
    district: primary.district,
    latitude: Number(primary.latitude),
    longitude: Number(primary.longitude),
  };
}

function flattenGarage(row: GarageQueryRow, favoriteIds: Set<string>): GarageWithFavorite {
  const { garage_locations, ...garage } = row;
  const location = pickPrimaryLocation(garage_locations);
  return {
    ...garage,
    ...location,
    // Keep type compatible with screens that read address/district on Garage
    address: location.address ?? (garage as Garage).address ?? '',
    district: location.district ?? (garage as Garage).district ?? '',
    latitude: location.latitude ?? (garage as Garage).latitude ?? 0,
    longitude: location.longitude ?? (garage as Garage).longitude ?? 0,
    isFavorite: favoriteIds.has(garage.id),
  };
}

const GARAGE_SELECT = `
  *,
  garage_locations (
    address,
    district,
    latitude,
    longitude,
    is_primary
  )
`;

async function loadFavoriteIds(userId?: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data: favorites } = await supabase
    .from('garage_favorites')
    .select('garage_id')
    .eq('user_id', userId);
  return new Set((favorites ?? []).map((f) => f.garage_id));
}

export async function listGarages(
  userId?: string,
  filters?: GarageFilters,
): Promise<GarageResult<GarageWithFavorite[]>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  let query = supabase
    .from('garages')
    .select(GARAGE_SELECT)
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (filters?.search) {
    const term = `%${filters.search}%`;
    query = query.or(`business_name.ilike.${term}`);
  }

  const { data: garages, error } = await query.limit(50);
  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };

  const favoriteIds = await loadFavoriteIds(userId);
  let withFavorites = ((garages ?? []) as GarageQueryRow[]).map((g) =>
    flattenGarage(g, favoriteIds),
  );

  if (filters?.district) {
    const district = filters.district.toLowerCase();
    withFavorites = withFavorites.filter((g) => g.district?.toLowerCase().includes(district));
  }
  if (filters?.search) {
    const term = filters.search.toLowerCase();
    withFavorites = withFavorites.filter(
      (g) =>
        g.business_name.toLowerCase().includes(term) ||
        g.address?.toLowerCase().includes(term) ||
        g.district?.toLowerCase().includes(term),
    );
  }

  return { data: withFavorites, error: null };
}

export async function listNearbyGarages(opts: {
  latitude: number;
  longitude: number;
  userId?: string;
  radiusKm?: number;
  limit?: number;
  serviceCategories?: string[];
}): Promise<GarageResult<NearbyGarage[]>> {
  const listed = await listGarages(opts.userId);
  if (listed.error || !listed.data) return listed;

  const radiusKm = opts.radiusKm ?? 40;
  const limit = opts.limit ?? 8;
  const categories = opts.serviceCategories?.map((c) => c.toLowerCase()) ?? [];

  const ranked: NearbyGarage[] = listed.data
    .filter((g) => g.latitude != null && g.longitude != null && Number(g.latitude) !== 0)
    .map((g) => {
      const distanceKm = haversineDistanceKm(
        opts.latitude,
        opts.longitude,
        Number(g.latitude),
        Number(g.longitude),
      );
      return { ...g, distanceKm, source: 'drivemate' as const };
    })
    .filter((g) => g.distanceKm <= radiusKm)
    .filter((g) => {
      if (!categories.length) return true;
      const cats = (g.service_categories ?? []).map((c) => c.toLowerCase());
      return categories.some((c) => cats.includes(c) || cats.some((x) => x.includes(c)));
    })
    .sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (Math.abs(ratingDiff) > 0.05) return ratingDiff;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit);

  // If category filter emptied the list, fall back to rating+distance without category.
  if (!ranked.length && categories.length) {
    return listNearbyGarages({ ...opts, serviceCategories: undefined });
  }

  return { data: ranked, error: null };
}

export async function getGarage(
  garageId: string,
  userId?: string,
): Promise<GarageResult<GarageWithFavorite>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data, error } = await supabase
    .from('garages')
    .select(GARAGE_SELECT)
    .eq('id', garageId)
    .maybeSingle();
  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  if (!data) return { data: null, error: { message: 'Garage not found', code: 'not_found' } };

  const favoriteIds = await loadFavoriteIds(userId);
  return { data: flattenGarage(data as GarageQueryRow, favoriteIds), error: null };
}

export async function toggleFavorite(
  userId: string,
  garageId: string,
): Promise<GarageResult<{ isFavorite: boolean }>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data: existing } = await supabase
    .from('garage_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('garage_id', garageId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('garage_favorites').delete().eq('id', existing.id);
    const mapped = mapError(error);
    if (mapped) return { data: null, error: mapped };
    return { data: { isFavorite: false }, error: null };
  }

  const { error } = await supabase.from('garage_favorites').insert({ user_id: userId, garage_id: garageId });
  const mapped = mapError(error);
  if (mapped) return { data: null, error: mapped };
  return { data: { isFavorite: true }, error: null };
}
