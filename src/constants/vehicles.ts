export const VehicleType = {
  CAR: 'car',
  SUV: 'suv',
  VAN: 'van',
  MOTORCYCLE: 'motorcycle',
  SCOOTER: 'scooter',
  THREE_WHEELER: 'three_wheeler',
  TRUCK: 'truck',
  HYBRID: 'hybrid',
  EV: 'ev',
} as const;

export type VehicleTypeValue = (typeof VehicleType)[keyof typeof VehicleType];

export const VEHICLE_TYPES: readonly VehicleTypeValue[] = [
  VehicleType.CAR,
  VehicleType.SUV,
  VehicleType.VAN,
  VehicleType.MOTORCYCLE,
  VehicleType.SCOOTER,
  VehicleType.THREE_WHEELER,
  VehicleType.TRUCK,
  VehicleType.HYBRID,
  VehicleType.EV,
] as const;

export const VEHICLE_TYPE_LABELS: Record<VehicleTypeValue, string> = {
  [VehicleType.CAR]: 'Car',
  [VehicleType.SUV]: 'SUV',
  [VehicleType.VAN]: 'Van',
  [VehicleType.MOTORCYCLE]: 'Motor Bike',
  [VehicleType.SCOOTER]: 'Scooter',
  [VehicleType.THREE_WHEELER]: '3 Wheel',
  [VehicleType.TRUCK]: 'Truck',
  [VehicleType.HYBRID]: 'Hybrid',
  [VehicleType.EV]: 'Electric Vehicle',
};

/** First-phase selectable types in create / onboarding forms. */
export const PHASE1_VEHICLE_TYPES = [
  VehicleType.CAR,
  VehicleType.VAN,
  VehicleType.THREE_WHEELER,
  VehicleType.MOTORCYCLE,
] as const satisfies readonly VehicleTypeValue[];

export type Phase1VehicleType = (typeof PHASE1_VEHICLE_TYPES)[number];

export const FuelType = {
  PETROL: 'petrol',
  DIESEL: 'diesel',
  HYBRID: 'hybrid',
  ELECTRIC: 'electric',
  CNG: 'cng',
  LPG: 'lpg',
} as const;

export type FuelTypeValue = (typeof FuelType)[keyof typeof FuelType];

export const FUEL_TYPES: readonly FuelTypeValue[] = [
  FuelType.PETROL,
  FuelType.DIESEL,
  FuelType.HYBRID,
  FuelType.ELECTRIC,
  FuelType.CNG,
  FuelType.LPG,
] as const;

export const FUEL_TYPE_LABELS: Record<FuelTypeValue, string> = {
  [FuelType.PETROL]: 'Petrol',
  [FuelType.DIESEL]: 'Diesel',
  [FuelType.HYBRID]: 'Hybrid',
  [FuelType.ELECTRIC]: 'Electric',
  [FuelType.CNG]: 'CNG',
  [FuelType.LPG]: 'LPG',
};

export const TransmissionType = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
  CVT: 'cvt',
  DCT: 'dct',
  SEMI_AUTOMATIC: 'semi_automatic',
} as const;

export type TransmissionTypeValue =
  (typeof TransmissionType)[keyof typeof TransmissionType];

export const TRANSMISSION_TYPES: readonly TransmissionTypeValue[] = [
  TransmissionType.MANUAL,
  TransmissionType.AUTOMATIC,
  TransmissionType.CVT,
  TransmissionType.DCT,
  TransmissionType.SEMI_AUTOMATIC,
] as const;

export const TRANSMISSION_TYPE_LABELS: Record<TransmissionTypeValue, string> = {
  [TransmissionType.MANUAL]: 'Manual',
  [TransmissionType.AUTOMATIC]: 'Automatic',
  [TransmissionType.CVT]: 'CVT',
  [TransmissionType.DCT]: 'DCT',
  [TransmissionType.SEMI_AUTOMATIC]: 'Semi-Automatic',
};

export const OwnershipType = {
  OWNED: 'owned',
  LEASED: 'leased',
  FINANCED: 'financed',
  COMPANY: 'company',
} as const;

export type OwnershipTypeValue =
  (typeof OwnershipType)[keyof typeof OwnershipType];

export const OWNERSHIP_TYPES: readonly OwnershipTypeValue[] = [
  OwnershipType.OWNED,
  OwnershipType.LEASED,
  OwnershipType.FINANCED,
  OwnershipType.COMPANY,
] as const;

export const OWNERSHIP_TYPE_LABELS: Record<OwnershipTypeValue, string> = {
  [OwnershipType.OWNED]: 'Owned',
  [OwnershipType.LEASED]: 'Leased',
  [OwnershipType.FINANCED]: 'Financed',
  [OwnershipType.COMPANY]: 'Company',
};
