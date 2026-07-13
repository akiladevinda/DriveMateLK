import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  moneyMinorSchema,
  optionalMoneyMinorSchema,
} from '@/schemas/common';

const fuelTypeSchema = z.enum([
  'petrol',
  'diesel',
  'hybrid_petrol',
  'hybrid_diesel',
  'electric',
  'cng',
  'other',
]);

export const fuelEntryCreateSchema = z.object({
  vehicle_id: z.uuid(),
  entry_date: isoDateSchema,
  odometer: z.number().nonnegative().max(2_000_000),
  litres: z.number().positive().max(500),
  total_amount_minor: moneyMinorSchema,
  price_per_litre_minor: optionalMoneyMinorSchema,
  currency: currencyCodeSchema,
  fuel_type: fuelTypeSchema,
  fuel_station: z.string().trim().max(120).optional().nullable(),
  is_full_tank: z.boolean().default(true),
  receipt_storage_path: z.string().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const fuelEntryUpdateSchema = fuelEntryCreateSchema
  .omit({ vehicle_id: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type FuelEntryCreateInput = z.infer<typeof fuelEntryCreateSchema>;
export type FuelEntryUpdateInput = z.infer<typeof fuelEntryUpdateSchema>;
