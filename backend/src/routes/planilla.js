import express from 'express';
import { aprobarPlanilla } from '../controllers/aprobarPlanillaController.js';

const router = express.Router();

// Ruta para aprobar planilla
router.post('/aprobarPlanilla', aprobarPlanilla);

export default router;
