import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

export const byPeriodSchema = z.object({
  query: z.object({
    from: isoDate,
    to: isoDate,
  }),
});

export const daysQuerySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional(),
  }),
});

export const askSchema = z.object({
  body: z.object({
    question: z.string().min(1).max(1000),
    language: z.enum(['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or']).optional(),
  }),
});
