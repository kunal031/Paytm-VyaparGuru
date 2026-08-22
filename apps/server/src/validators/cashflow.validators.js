import { z } from 'zod';

export const daysQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(7).max(365).optional(),
  }),
});

export const forecastQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(7).max(60).optional(),
  }),
});
