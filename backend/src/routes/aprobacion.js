import { Router } from 'express';
import { getAprobaciones } from '../controllers/aprobacionController.js';

const router = Router();

router.get('/', getAprobaciones);

export default router;
