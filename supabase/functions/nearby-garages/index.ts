import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';
import { isAuthContext, verifyAuth } from '../_shared/auth.ts';

type NearbyBody = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

type PlaceResult = {
  placeId: string;
  name: string;
  address: string | null;
  phone: string | null;
  rating: number | null;
  reviewCount: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  openNow: boolean | null;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const auth = await verifyAuth(req);
  if (!isAuthContext(auth)) return auth;

  const apiKey =
    Deno.env.get('GOOGLE_PLACES_API_KEY') ??
    Deno.env.get('GOOGLE_MAPS_API_KEY') ??
    '';

  if (!apiKey) {
    return errorResponse(
      'Google Places is not configured. Set GOOGLE_PLACES_API_KEY on this Edge Function.',
      503,
    );
  }

  let body: NearbyBody;
  try {
    body = (await req.json()) as NearbyBody;
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return errorResponse('latitude and longitude are required');
  }

  const radiusMeters = Math.min(Math.max(Number(body.radiusMeters) || 15000, 1000), 50000);

  const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  nearbyUrl.searchParams.set('location', `${latitude},${longitude}`);
  nearbyUrl.searchParams.set('radius', String(radiusMeters));
  nearbyUrl.searchParams.set('type', 'car_repair');
  nearbyUrl.searchParams.set('key', apiKey);

  const nearbyRes = await fetch(nearbyUrl.toString());
  const nearbyJson = (await nearbyRes.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      place_id: string;
      name: string;
      vicinity?: string;
      rating?: number;
      user_ratings_total?: number;
      geometry?: { location?: { lat: number; lng: number } };
      opening_hours?: { open_now?: boolean };
    }>;
  };

  if (nearbyJson.status !== 'OK' && nearbyJson.status !== 'ZERO_RESULTS') {
    return errorResponse(
      nearbyJson.error_message ?? `Google Places Nearby failed (${nearbyJson.status})`,
      502,
    );
  }

  const top = (nearbyJson.results ?? [])
    .filter((r) => r.geometry?.location)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);

  const places: PlaceResult[] = [];

  for (const place of top) {
    const lat = place.geometry!.location!.lat;
    const lng = place.geometry!.location!.lng;
    let phone: string | null = null;

    try {
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', place.place_id);
      detailsUrl.searchParams.set('fields', 'formatted_phone_number,international_phone_number');
      detailsUrl.searchParams.set('key', apiKey);
      const detailsRes = await fetch(detailsUrl.toString());
      const detailsJson = (await detailsRes.json()) as {
        result?: {
          formatted_phone_number?: string;
          international_phone_number?: string;
        };
      };
      phone =
        detailsJson.result?.international_phone_number ??
        detailsJson.result?.formatted_phone_number ??
        null;
    } catch {
      phone = null;
    }

    places.push({
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity ?? null,
      phone,
      rating: place.rating ?? null,
      reviewCount: place.user_ratings_total ?? 0,
      latitude: lat,
      longitude: lng,
      distanceKm: Math.round(haversineKm(latitude, longitude, lat, lng) * 10) / 10,
      openNow: place.opening_hours?.open_now ?? null,
    });
  }

  places.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.distanceKm - b.distanceKm);

  return jsonResponse({ places, source: 'google_places' });
});
