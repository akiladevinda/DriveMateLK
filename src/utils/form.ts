import type { FieldValues, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/** Bridges Zod input/output inference differences with react-hook-form resolvers. */
export function createZodResolver<TSchema extends z.ZodType<FieldValues, FieldValues>>(
  schema: TSchema,
): Resolver<z.infer<TSchema>> {
  return zodResolver(schema) as Resolver<z.infer<TSchema>>;
}
