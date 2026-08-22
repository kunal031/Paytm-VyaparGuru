import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { saveSkusSchema } from '../validators/inventory.validators.js';
import {
  listSKUs,
  overview,
  onboardPhoto,
  onboardVoice,
  saveSkus,
  attribute,
} from '../controllers/inventory.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);
router.get('/skus', listSKUs);
router.get('/overview', overview);
router.post('/onboard/photo', upload.single('photo'), onboardPhoto);
router.post('/onboard/voice', upload.single('audio'), onboardVoice);
router.post('/skus/bulk', validate(saveSkusSchema), saveSkus);
router.post('/attribute', attribute);

export default router;
