import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  moneyMinorSchema,
  optionalMoneyMinorSchema,
} from '@/schemas/common';

export const insurancePolicyCreateSchema = z.object({
  vehicle_id: z.uuid(),
  insurer_name: z.string().trim().min(1).max(120),
  policy_number: z.string().trim().min(1).max(80),
  coverage_type: z.string().trim().max(80).optional().nullable(),
  premium_minor: optionalMoneyMinorSchema,
  currency: currencyCodeSchema,
  start_date: isoDateSchema,
  expiry_date: isoDateSchema,
  contact_phone: z.string().trim().max(30).optional().nullable(),
  contact_email: z.string().trim().email().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const insuranceClaimCreateSchema = z.object({
  vehicle_id: z.uuid(),
  policy_id: z.uuid().optional().nullable(),
  claim_number: z.string().trim().max(80).optional().nullable(),
  incident_date: isoDateSchema,
  description: z.string().trim().min(1).max(4000),
  claimed_amount_minor: optionalMoneyMinorSchema,
  currency: currencyCodeSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type InsurancePolicyCreateInput = z.infer<typeof insurancePolicyCreateSchema>;
export type InsuranceClaimCreateInput = z.infer<typeof insuranceClaimCreateSchema>;
