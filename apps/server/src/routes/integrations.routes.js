import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { list, connect, disconnect, importData, viewData } from '../controllers/integrations.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/:provider/connect', connect);
router.post('/:provider/disconnect', disconnect);
router.post('/:provider/import', upload.single('file'), importData);
router.get('/:provider/data', viewData);

export default router;
