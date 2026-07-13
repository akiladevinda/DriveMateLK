import { z } from 'zod';

import { currencyCodeSchema, isoDateSchema, moneyMinorSchema } from '@/schemas/common';

const expenseCategorySchema = z.enum([
  'fuel',
  'service',
  'repair',
  'insurance',
  'revenue_licence',
  'emission_test',
  'tires',
  'battery',
  'parking',
  'highway_toll',
  'cleaning',
  'accessories',
  'modification',
  'leasing',
  'inspection',
  'roadside_assistance',
  'other',
]);

export const expenseCreateSchema = z.object({
  vehicle_id: z.uuid(),
  category: expenseCategorySchema,
  title: z.string().trim().min(1, 'Title is required').max(160),
  expense_date: isoDateSchema,
  amount_minor: moneyMinorSchema,
  currency: currencyCodeSchema,
  odometer: z.number().nonnegative().max(2_000_000).optional().nullable(),
  vendor: z.string().trim().max(120).optional().nullable(),
  receipt_storage_path: z.string().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  linked_service_id: z.uuid().optional().nullable(),
  linked_fuel_entry_id: z.uuid().optional().nullable(),
});

export const expenseUpdateSchema = expenseCreateSchema
  .omit({ vehicle_id: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
