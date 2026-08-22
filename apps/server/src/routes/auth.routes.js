import { Router } from 'express';
import { signup, login, me } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { signupSchema, loginSchema } from '../validators/auth.validators.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

export default router;
