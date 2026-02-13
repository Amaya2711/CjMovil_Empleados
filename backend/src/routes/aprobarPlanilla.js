import express from 'express';
import { aprobarPlanilla } from '../controllers/aprobarPlanillaController.js';

const router = express.Router();

// Ejecuta el store sp_Movil_AprobarPlanilla
router.post('/aprobarPlanilla', aprobarPlanilla);

export default router;
