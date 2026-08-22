import { z } from 'zod';
import { SKU_CREATED_VIA } from '../config/constants.js';

const skuDraftSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional(),
  price: z.number().int().min(0).nullable().optional(), // paise
  costPrice: z.number().int().min(0).nullable().optional(), // paise
  currentStock: z.number().int().min(0).nullable().optional(),
  unit: z.string().max(20).optional(),
  createdVia: z.enum(SKU_CREATED_VIA).optional(),
});

export const saveSkusSchema = z.object({
  body: z.object({
    items: z.array(skuDraftSchema).min(1).max(100),
  }),
});
