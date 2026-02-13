import express from 'express';
import { reporteGastos } from '../controllers/reporteGastosController.js';

const router = express.Router();

router.post('/reportes/gastos', reporteGastos);

export default router;
