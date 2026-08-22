import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { summary } from '../controllers/dashboard.controller.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', summary);

export default router;
