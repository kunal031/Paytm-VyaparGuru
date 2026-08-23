import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { BILL_PAYMENT_MODES } from '../config/constants.js';
import {
  create,
  list,
  detail,
  doReturn,
  daySummary,
  customers,
  addCustomer,
  khataPayment,
  customerKhata,
} from '../controllers/billing.controller.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const createBillSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          skuId: objectId.optional().nullable(),
          name: z.string().max(120).optional(),
          quantity: z.number().int().min(1).max(10000),
          unitPrice: z.number().int().min(0).optional(), // paise, only for custom items
        })
      )
      .min(1)
      .max(100),
    discount: z.number().int().min(0).optional(),
    paymentMode: z.enum(BILL_PAYMENT_MODES),
    customerId: objectId.optional().nullable(),
    customerName: z.string().max(120).optional().nullable(),
  }),
});

const returnSchema = z.object({
  body: z.object({
    amount: z.number().int().min(1),
    reason: z.string().max(200).optional(),
    restock: z
      .array(z.object({ skuId: objectId, quantity: z.number().int().min(1) }))
      .optional(),
  }),
});

const customerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    phone: z.string().max(15).optional().nullable(),
  }),
});

const paymentSchema = z.object({
  body: z.object({
    amount: z.number().int().min(1),
    paymentMode: z.enum(['Cash', 'QR']).optional(),
  }),
});

const router = Router();

router.use(requireAuth);

router.post('/bills', validate(createBillSchema), create);
router.get('/bills', list);
router.get('/bills/:id', detail);
router.post('/bills/:id/return', validate(returnSchema), doReturn);
router.get('/summary', daySummary);

router.get('/customers', customers);
router.post('/customers', validate(customerSchema), addCustomer);
router.get('/customers/:id', customerKhata);
router.post('/customers/:id/payment', validate(paymentSchema), khataPayment);

export default router;
