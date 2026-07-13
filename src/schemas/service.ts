import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  moneyMinorSchema,
  optionalIsoDateSchema,
} from '@/schemas/common';

export const serviceItemSchema = z.object({
  work_performed: z.string().trim().min(1).max(200),
  part_name: z.string().trim().max(120).optional().nullable(),
  part_brand: z.string().trim().max(80).optional().nullable(),
  part_number: z.string().trim().max(80).optional().nullable(),
  quantity: z.number().positive().default(1),
  unit_cost_minor: moneyMinorSchema.default(0),
  warranty_expiry: optionalIsoDateSchema,
});

export const serviceRecordCreateSchema = z.object({
  vehicle_id: z.uuid(),
  service_date: isoDateSchema,
  odometer: z.number().nonnegative().max(2_000_000),
  garage_id: z.uuid().optional().nullable(),
  garage_name: z.string().trim().max(120).optional().nullable(),
  service_type: z.string().trim().min(1).max(120),
  labour_cost_minor: moneyMinorSchema.default(0),
  parts_cost_minor: moneyMinorSchema.default(0),
  other_cost_minor: moneyMinorSchema.default(0),
  total_cost_minor: moneyMinorSchema,
  currency: currencyCodeSchema,
  invoice_storage_path: z.string().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  warranty_until: optionalIsoDateSchema,
  next_service_date: optionalIsoDateSchema,
  next_service_odometer: z.number().nonnegative().max(2_000_000).optional().nullable(),
  items: z.array(serviceItemSchema).optional(),
});

export const serviceRecordUpdateSchema = serviceRecordCreateSchema
  .omit({ vehicle_id: true, items: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ServiceItemInput = z.infer<typeof serviceItemSchema>;
export type ServiceRecordCreateInput = z.infer<typeof serviceRecordCreateSchema>;
export type ServiceRecordUpdateInput = z.infer<typeof serviceRecordUpdateSchema>;
