import {
  getFallbackModelsForType,
  getPopularMakesForType,
  NHTSA_VPIC_BASE,
} from '@/constants/vehicle-catalog';
import type { Phase1VehicleType } from '@/constants/vehicles';

type NhtsaModelsResponse = {
  Results?: Array<{ Make_Name?: string; Model_Name?: string }>;
};

type NhtsaMakesResponse = {
  Results?: Array<{ MakeName?: string; Make_Name?: string }>;
};

const makeCache = new Map<string, string[]>();
const modelCache = new Map<string, string[]>();
const remoteMakesPromise = new Map<string, Promise<string[]>>();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function uniquePreserveOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalize(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

function rankByQuery(items: string[], query: string, limit = 10): string[] {
  const q = normalize(query);
  if (!q) return items.slice(0, limit);

  const starts: string[] = [];
  const includes: string[] = [];

  for (const item of items) {
    const n = normalize(item);
    if (n.startsWith(q)) {
      starts.push(item);
    } else if (n.includes(q)) {
      includes.push(item);
    }
  }

  return uniquePreserveOrder([...starts, ...includes]).slice(0, limit);
}

function shouldUseRemoteCatalog(vehicleType: Phase1VehicleType | string): boolean {
  return vehicleType === 'car' || vehicleType === 'van' || vehicleType === 'motorcycle';
}

function nhtsaVehicleType(vehicleType: Phase1VehicleType | string): string | null {
  switch (vehicleType) {
    case 'car':
      return 'car';
    case 'motorcycle':
      return 'motorcycle';
    case 'van':
      // NHTSA has limited van coverage; still enrich with truck/mpv-ish makes via car + local list.
      return 'truck';
    default:
      return null;
  }
}

async function fetchMakesFromApi(vehicleType: Phase1VehicleType | string): Promise<string[]> {
  const popular = [...getPopularMakesForType(vehicleType)];
  const apiType = nhtsaVehicleType(vehicleType);
  if (!apiType || !shouldUseRemoteCatalog(vehicleType)) {
    return popular;
  }

  const existing = remoteMakesPromise.get(apiType);
  if (existing) {
    return existing.then((remote) => uniquePreserveOrder([...popular, ...remote]));
  }

  const promise = (async () => {
    try {
      const response = await fetch(
        `${NHTSA_VPIC_BASE}/GetMakesForVehicleType/${apiType}?format=json`,
      );
      if (!response.ok) {
        throw new Error(`Make lookup failed (${response.status})`);
      }
      const json = (await response.json()) as NhtsaMakesResponse;
      return (json.Results ?? [])
        .map((row) => row.MakeName ?? row.Make_Name ?? '')
        .filter(Boolean);
    } catch {
      return [];
    }
  })();

  remoteMakesPromise.set(apiType, promise);
  const remote = await promise;
  return uniquePreserveOrder([...popular, ...remote]);
}

/**
 * Suggest vehicle makes for the selected type (Sri Lanka-first lists).
 * Custom typed makes are always allowed.
 */
export async function suggestMakes(
  query: string,
  vehicleType: Phase1VehicleType | string = 'car',
): Promise<string[]> {
  const popular = getPopularMakesForType(vehicleType);
  const q = query.trim();
  if (q.length < 1) {
    return [...popular].slice(0, 10);
  }

  const cacheKey = `${vehicleType}::${normalize(q).slice(0, 24)}`;
  const cached = makeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const allMakes = await fetchMakesFromApi(vehicleType);
  const ranked = rankByQuery(allMakes, q, 10);
  makeCache.set(cacheKey, ranked);
  return ranked;
}

/**
 * Suggest models for a make + vehicle type.
 * Three-wheelers use local SL lists only; cars/vans/bikes may enrich via NHTSA.
 */
export async function suggestModels(
  make: string,
  query: string,
  vehicleType: Phase1VehicleType | string = 'car',
): Promise<string[]> {
  const makeName = make.trim();
  if (makeName.length < 2) {
    return [];
  }

  const makeKey = normalize(makeName);
  const q = query.trim();
  const cacheKey = `${vehicleType}::${makeKey}::${normalize(q).slice(0, 24)}`;
  const cached = modelCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fallback = getFallbackModelsForType(vehicleType, makeKey);
  let remote: string[] = [];

  if (shouldUseRemoteCatalog(vehicleType) && vehicleType !== 'van') {
    try {
      const encoded = encodeURIComponent(makeName);
      const response = await fetch(
        `${NHTSA_VPIC_BASE}/GetModelsForMake/${encoded}?format=json`,
      );
      if (response.ok) {
        const json = (await response.json()) as NhtsaModelsResponse;
        remote = (json.Results ?? [])
          .map((row) => row.Model_Name ?? '')
          .filter(Boolean);
      }
    } catch {
      // Offline / network — use fallback only.
    }
  }

  // Prefer local SL models first so Sri Lankan names rank above US-centric NHTSA rows.
  const combined = uniquePreserveOrder([...fallback, ...remote]);
  const ranked = q ? rankByQuery(combined, q, 12) : combined.slice(0, 12);
  modelCache.set(cacheKey, ranked);
  return ranked;
}
