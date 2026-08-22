import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { daysQuerySchema, forecastQuerySchema } from '../validators/cashflow.validators.js';
import {
  summary,
  daily,
  expenses,
  hiddenExpenses,
  forecast,
} from '../controllers/cashflow.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', summary);
router.get('/daily', validate(daysQuerySchema), daily);
router.get('/expenses', validate(daysQuerySchema), expenses);
router.get('/hidden-expenses', hiddenExpenses);
router.get('/forecast', validate(forecastQuerySchema), forecast);

export default router;
