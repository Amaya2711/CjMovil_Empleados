import express from 'express';
import { reportePlanillaDinamico } from '../controllers/reportePlanillaController.js';

const router = express.Router();

router.post('/reportes/planilla-dinamico', reportePlanillaDinamico);

export default router;
