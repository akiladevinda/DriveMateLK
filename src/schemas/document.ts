import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  moneyMinorSchema,
  optionalIsoDateSchema,
  optionalMoneyMinorSchema,
} from '@/schemas/common';

const documentTypeSchema = z.enum([
  'registration_certificate',
  'insurance_certificate',
  'revenue_licence',
  'emission_certificate',
  'lease_agreement',
  'service_invoice',
  'repair_receipt',
  'warranty',
  'tire_warranty',
  'battery_warranty',
  'driving_licence',
  'other',
]);

const documentStatusSchema = z.enum([
  'valid',
  'expiring_soon',
  'expired',
  'no_expiry',
  'pending_confirmation',
]);

export const documentCreateSchema = z.object({
  vehicle_id: z.uuid(),
  document_type: documentTypeSchema,
  title: z.string().trim().min(1, 'Title is required').max(160),
  provider: z.string().trim().max(120).optional().nullable(),
  reference_number: z.string().trim().max(80).optional().nullable(),
  issue_date: optionalIsoDateSchema,
  expiry_date: optionalIsoDateSchema,
  amount_minor: optionalMoneyMinorSchema,
  currency: currencyCodeSchema,
  owner_name: z.string().trim().max(120).optional().nullable(),
  storage_path: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(120),
  file_size_bytes: z.number().int().positive(),
  status: documentStatusSchema.default('pending_confirmation'),
  extraction_confirmed: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const documentUpdateSchema = documentCreateSchema
  .omit({ vehicle_id: true, storage_path: true, mime_type: true, file_size_bytes: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
