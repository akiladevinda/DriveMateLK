import { z } from 'zod';

import {
  currencyCodeSchema,
  isoDateSchema,
  moneyMinorSchema,
  optionalMoneyMinorSchema,
} from '@/schemas/common';

export const leaseRecordCreateSchema = z.object({
  vehicle_id: z.uuid(),
  provider_name: z.string().trim().min(1).max(120),
  original_price_minor: moneyMinorSchema,
  down_payment_minor: moneyMinorSchema.default(0),
  financed_amount_minor: moneyMinorSchema,
  currency: currencyCodeSchema,
  start_date: isoDateSchema,
  term_months: z.number().int().positive().max(360),
  monthly_payment_minor: moneyMinorSchema,
  interest_rate_percent: z.number().nonnegative().max(100).optional().nullable(),
  remaining_instalments: z.number().int().nonnegative().optional().nullable(),
  official_settlement_minor: optionalMoneyMinorSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const leasePaymentCreateSchema = z.object({
  lease_record_id: z.uuid(),
  due_date: isoDateSchema,
  paid_date: isoDateSchema.optional().nullable(),
  amount_minor: moneyMinorSchema,
  currency: currencyCodeSchema,
  status: z.enum(['pending', 'paid', 'overdue', 'waived']).default('pending'),
  reference_number: z.string().trim().max(80).optional().nullable(),
});

export type LeaseRecordCreateInput = z.infer<typeof leaseRecordCreateSchema>;
export type LeasePaymentCreateInput = z.infer<typeof leasePaymentCreateSchema>;
