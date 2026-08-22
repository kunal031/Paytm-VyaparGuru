import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { list, connect, disconnect, importData, viewData } from '../controllers/integrations.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

router.get('/', list);
// Authorization: managing integrations and importing data is owner-only;
// staff can still view what was imported
router.post('/:provider/connect', requireRole('owner'), connect);
router.post('/:provider/disconnect', requireRole('owner'), disconnect);
router.post('/:provider/import', requireRole('owner'), upload.single('file'), importData);
router.get('/:provider/data', viewData);

export default router;
