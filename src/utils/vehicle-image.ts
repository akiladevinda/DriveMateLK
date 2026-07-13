import type { ImageSourcePropType } from 'react-native';

import type { Vehicle, VehicleType } from '@/types/database';

const TYPE_FALLBACKS: Record<string, ImageSourcePropType> = {
  car: require('../../assets/vehicles/hero-car.png'),
  suv: require('../../assets/vehicles/hero-car.png'),
  van: require('../../assets/vehicles/hero-van.png'),
  three_wheeler: require('../../assets/vehicles/hero-three-wheel.png'),
  motorcycle: require('../../assets/vehicles/hero-bike.png'),
  scooter: require('../../assets/vehicles/hero-bike.png'),
  truck: require('../../assets/vehicles/hero-van.png'),
  hybrid: require('../../assets/vehicles/hero-car.png'),
  ev: require('../../assets/vehicles/hero-car.png'),
  other: require('../../assets/vehicles/hero-car.png'),
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}

/**
 * Guess Imagin Studio modelFamily from free-text model names.
 * Examples: "318i" → "3", "C-HR" → "chr", "Aqua" → "aqua"
 */
export function guessModelFamily(make: string, model: string): string {
  const makeSlug = slugify(make);
  const cleaned = model.trim();

  if (makeSlug === 'bmw') {
    const series = cleaned.match(/^(\d)/);
    if (series) return series[1]!;
    if (/^x\d/i.test(cleaned)) return cleaned.slice(0, 2).toLowerCase();
    if (/^m\d/i.test(cleaned)) return cleaned.slice(0, 2).toLowerCase();
  }

  if (makeSlug === 'mercedesbenz' || makeSlug === 'mercedes') {
    const cls = cleaned.match(/^([A-Z])/i);
    if (cls) return cls[1]!.toLowerCase() + 'class';
  }

  return slugify(cleaned).slice(0, 24) || 'car';
}

/** Remote angle render for make/model when no uploaded photo exists. */
export function getVehicleCatalogImageUrl(make: string, model: string): string {
  const makeSlug = slugify(make) || 'toyota';
  const modelFamily = guessModelFamily(make, model);
  const params = new URLSearchParams({
    customer: 'img',
    make: makeSlug,
    modelFamily,
    angle: '23',
    width: '800',
    zoomType: 'fullscreen',
    paintId: 'pspc0062',
  });
  return `https://cdn.imagin.studio/getImage?${params.toString()}`;
}

export function getVehicleTypeFallbackImage(type: VehicleType | string): ImageSourcePropType {
  return TYPE_FALLBACKS[type] ?? TYPE_FALLBACKS.car!;
}

export type VehicleImageSource =
  | { kind: 'uri'; uri: string }
  | { kind: 'local'; source: ImageSourcePropType };

/**
 * Prefer uploaded photo → catalog render by make/model → type illustration.
 */
export function resolveVehicleHeroImage(vehicle: Pick<
  Vehicle,
  'make' | 'model' | 'vehicle_type' | 'main_image_url'
>): VehicleImageSource {
  if (vehicle.main_image_url) {
    return { kind: 'uri', uri: vehicle.main_image_url };
  }
  if (vehicle.make.trim() && vehicle.model.trim()) {
    return { kind: 'uri', uri: getVehicleCatalogImageUrl(vehicle.make, vehicle.model) };
  }
  return { kind: 'local', source: getVehicleTypeFallbackImage(vehicle.vehicle_type) };
}
