import { z } from 'zod';

import { currencyCodeSchema, isoDateSchema, moneyMinorSchema, optionalIsoDateSchema } from '@/schemas/common';

/** Full DB set — forms currently offer phase-1 options only. */
const vehicleTypeSchema = z.enum([
  'car',
  'suv',
  'van',
  'motorcycle',
  'scooter',
  'three_wheeler',
  'truck',
  'ev',
  'hybrid',
  'other',
]);

/** First-phase create/onboarding options: Car, Van, 3 Wheel, Motor Bike. */
export const phase1VehicleTypeSchema = z.enum([
  'car',
  'van',
  'three_wheeler',
  'motorcycle',
]);

const fuelTypeSchema = z.enum([
  'petrol',
  'diesel',
  'hybrid_petrol',
  'hybrid_diesel',
  'electric',
  'cng',
  'other',
]);

const transmissionSchema = z.enum(['manual', 'automatic', 'cvt', 'dct', 'other']);

const odometerUnitSchema = z.enum(['km', 'mi']);

const ownershipTypeSchema = z.enum(['owned', 'leased', 'financed', 'company']);

const financingStatusSchema = z.enum(['none', 'active', 'settled']);

const currentYear = new Date().getFullYear();

const vehicleCoreFields = {
  nickname: z.string().trim().max(80).optional().nullable(),
  registration_number: z
    .string()
    .trim()
    .min(2, 'Registration number is required')
    .max(20, 'Registration number is too long')
    .transform((value) => value.toUpperCase()),
  make: z.string().trim().min(1, 'Make is required').max(80),
  model: z.string().trim().min(1, 'Model is required').max(80),
  variant: z.string().trim().max(80).optional().nullable(),
  manufacture_year: z
    .number()
    .int()
    .min(1950, 'Enter a valid manufacture year')
    .max(currentYear + 1),
  registration_year: z
    .number()
    .int()
    .min(1950)
    .max(currentYear + 1)
    .optional()
    .nullable(),
  vehicle_type: vehicleTypeSchema,
  fuel_type: fuelTypeSchema,
  transmission: transmissionSchema,
  engine_capacity_cc: z.number().int().positive().max(10000).optional().nullable(),
  vin: z.string().trim().max(17).optional().nullable(),
  chassis_number: z.string().trim().max(40).optional().nullable(),
  engine_number: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  current_odometer: z.number().nonnegative().max(2_000_000),
  odometer_unit: odometerUnitSchema.default('km'),
  purchase_date: optionalIsoDateSchema,
  purchase_price_minor: moneyMinorSchema.optional().nullable(),
  purchase_currency: currencyCodeSchema,
  ownership_type: ownershipTypeSchema.default('owned'),
  financing_status: financingStatusSchema.default('none'),
  previous_owners_count: z.number().int().min(0).max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  main_image_url: z.url().optional().nullable(),
  is_primary: z.boolean().default(false),
};

export const vehicleCreateSchema = z.object({
  ...vehicleCoreFields,
  vehicle_type: phase1VehicleTypeSchema.default('car'),
});

export const vehicleUpdateSchema = z
  .object({
    ...Object.fromEntries(
      Object.entries(vehicleCoreFields).map(([key, schema]) => [key, schema.optional()]),
    ),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const vehicleOdometerUpdateSchema = z.object({
  current_odometer: z.number().nonnegative().max(2_000_000),
  recorded_at: isoDateSchema.optional(),
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
export type VehicleOdometerUpdateInput = z.infer<typeof vehicleOdometerUpdateSchema>;
