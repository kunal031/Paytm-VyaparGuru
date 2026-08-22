import { Router } from 'express';
import { signup, login, me, createStaff, listStaff, removeStaff } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { signupSchema, loginSchema, staffSchema } from '../validators/auth.validators.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

// Team management — authorization: owners only
router.get('/staff', requireAuth, requireRole('owner'), listStaff);
router.post('/staff', requireAuth, requireRole('owner'), validate(staffSchema), createStaff);
router.delete('/staff/:id', requireAuth, requireRole('owner'), removeStaff);

export default router;
