import { z } from 'zod';

import { isoDateSchema, optionalIsoDateSchema } from '@/schemas/common';

export const maintenanceScheduleCreateSchema = z.object({
  vehicle_id: z.uuid(),
  maintenance_type: z.string().trim().min(1).max(120),
  due_date: optionalIsoDateSchema,
  due_odometer: z.number().nonnegative().max(2_000_000).optional().nullable(),
  repeat_interval_months: z.number().int().positive().max(120).optional().nullable(),
  repeat_interval_km: z.number().int().positive().max(500_000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type MaintenanceScheduleCreateInput = z.infer<typeof maintenanceScheduleCreateSchema>;
