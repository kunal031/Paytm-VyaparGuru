import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { ask } from '../controllers/sales.controller.js';

const router = Router();

router.use(requireAuth);
router.post('/ask', ask);

export default router;
