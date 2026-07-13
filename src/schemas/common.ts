import { z } from 'zod';

/**
 * Accepts integer minor units (e.g. 125000 for LKR 1,250.00)
 * or major units as a decimal number/string, which is converted to minor units.
 */
export const moneyMinorSchema = z
  .union([
    z.number().int().nonnegative(),
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Invalid money amount')
      .transform((value) => Math.round(parseFloat(value) * 100)),
    z
      .number()
      .nonnegative()
      .transform((value) => Math.round(value * 100)),
  ])
  .describe('Money in integer minor units; major-unit decimals are coerced ×100');

export const optionalMoneyMinorSchema = moneyMinorSchema.optional().nullable();

export const currencyCodeSchema = z
  .string()
  .length(3, 'Currency must be a 3-letter ISO code')
  .transform((value) => value.toUpperCase())
  .default('LKR');

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const optionalIsoDateSchema = isoDateSchema.optional().nullable();
