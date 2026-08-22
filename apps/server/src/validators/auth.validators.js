import { z } from 'zod';
import { BUSINESS_TYPES } from '../config/constants.js';

const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile numbers

export const signupSchema = z.object({
  body: z.object({
    businessName: z.string().min(2).max(120),
    ownerName: z.string().min(2).max(120),
    phone: z.string().regex(phoneRegex, 'Must be a valid 10-digit Indian mobile number'),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    businessType: z.enum(BUSINESS_TYPES),
    location: z
      .object({
        city: z.string().max(80).optional(),
        state: z.string().max(80).optional(),
      })
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    // Login with either email or phone
    identifier: z.string().min(3),
    password: z.string().min(1),
  }),
});
