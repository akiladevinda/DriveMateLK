import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import * as garageService from '@/services/garage-service';
import type { NearbyGarage } from '@/services/garage-service';

export type NearbyGarageSuggestion = {
  id: string;
  name: string;
  address: string | null;
  district: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  latitude: number;
  longitude: number;
  serviceCategories: string[];
  verified: boolean;
  source: 'google_places' | 'drivemate';
  matchReason?: string;
};

type GooglePlacesEdgeItem = {
  placeId: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  latitude: number;
  longitude: number;
  distanceKm?: number | null;
  openNow?: boolean | null;
};

function mapDriveMateGarage(g: NearbyGarage, matchReason?: string): NearbyGarageSuggestion {
  return {
    id: g.id,
    name: g.business_name,
    address: g.address,
    district: g.district,
    phone: g.phone,
    rating: g.rating,
    reviewCount: g.review_count ?? 0,
    distanceKm: g.distanceKm,
    latitude: Number(g.latitude),
    longitude: Number(g.longitude),
    serviceCategories: g.service_categories ?? [],
    verified: g.verification_status === 'verified' || g.verification_status === 'demo',
    source: 'drivemate',
    matchReason,
  };
}

function mapGooglePlace(item: GooglePlacesEdgeItem): NearbyGarageSuggestion {
  return {
    id: item.placeId,
    name: item.name,
    address: item.address ?? null,
    district: null,
    phone: item.phone ?? null,
    rating: item.rating ?? null,
    reviewCount: item.reviewCount ?? 0,
    distanceKm: item.distanceKm ?? null,
    latitude: item.latitude,
    longitude: item.longitude,
    serviceCategories: ['car_repair'],
    verified: false,
    source: 'google_places',
    matchReason: 'Nearby car repair · ranked by Google rating',
  };
}

/** Map AI warning names to DriveMate garage service categories. */
export function serviceCategoriesForSymbols(symbolNames: string[]): string[] {
  const joined = symbolNames.join(' ').toLowerCase();
  const categories = new Set<string>();

  if (/check engine|mil|engine|emissions|catalytic/.test(joined)) {
    categories.add('diagnostics');
  }
  if (/brake|abs|handbrake|parking brake/.test(joined)) {
    categories.add('brakes');
  }
  if (/oil|engine oil/.test(joined)) {
    categories.add('oil_change');
    categories.add('diagnostics');
  }
  if (/battery|charging|alternator/.test(joined)) {
    categories.add('electrical');
  }
  if (/tyre|tire|tpms|pressure/.test(joined)) {
    categories.add('tyres');
  }
  if (/coolant|temperature|overheat/.test(joined)) {
    categories.add('diagnostics');
  }
  if (/airbag|srs/.test(joined)) {
    categories.add('electrical');
  }
  if (!categories.size) {
    categories.add('diagnostics');
    categories.add('general');
  }
  return [...categories];
}

async function fetchGooglePlacesNearby(opts: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}): Promise<{ places: NearbyGarageSuggestion[] | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { places: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      places?: GooglePlacesEdgeItem[];
      error?: string;
    }>('nearby-garages', {
      body: {
        latitude: opts.latitude,
        longitude: opts.longitude,
        radiusMeters: opts.radiusMeters ?? 15000,
      },
    });

    if (error) {
      let detail = error.message;
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const payload = (await context.json()) as { error?: string };
          if (payload?.error) detail = payload.error;
        }
      } catch {
        // keep detail
      }
      return { places: null, error: detail };
    }

    if (!data?.places?.length) {
      return { places: [], error: null };
    }

    const places = data.places
      .map(mapGooglePlace)
      .sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) || (a.distanceKm ?? 99) - (b.distanceKm ?? 99),
      );

    return { places, error: null };
  } catch (err) {
    return {
      places: null,
      error: err instanceof Error ? err.message : 'Google Places request failed',
    };
  }
}

export async function fetchNearbyGarageSuggestions(opts: {
  latitude: number;
  longitude: number;
  userId?: string;
  symbolNames?: string[];
}): Promise<{
  data: NearbyGarageSuggestion[];
  source: 'google_places' | 'drivemate';
  notice?: string;
}> {
  const categories = serviceCategoriesForSymbols(opts.symbolNames ?? []);
  const matchReason = categories.length
    ? `Matched for: ${categories.join(', ').replace(/_/g, ' ')}`
    : undefined;

  const google = await fetchGooglePlacesNearby({
    latitude: opts.latitude,
    longitude: opts.longitude,
  });

  if (google.places?.length) {
    return { data: google.places.slice(0, 8), source: 'google_places' };
  }

  const local = await garageService.listNearbyGarages({
    latitude: opts.latitude,
    longitude: opts.longitude,
    userId: opts.userId,
    serviceCategories: categories,
    radiusKm: 50,
    limit: 8,
  });

  const placesNotice =
    google.error ??
    (google.places?.length === 0
      ? 'Google Places returned no car-repair results near you.'
      : undefined);

  if (local.error || !local.data?.length) {
    return {
      data: [],
      source: 'drivemate',
      notice:
        placesNotice ??
        'No nearby workshops found. Add GOOGLE_PLACES_API_KEY for live Google-rated garages.',
    };
  }

  return {
    data: local.data.map((g) => mapDriveMateGarage(g, matchReason)),
    source: 'drivemate',
    notice:
      placesNotice ??
      'Showing DriveMate listings (not live Google). Set GOOGLE_PLACES_API_KEY on Supabase for Google-rated workshops.',
  };
}
