import express from 'express';
import { getDatosOc } from '../controllers/datosocController.js';

const router = express.Router();

// Ruta para obtener datos de OC
router.post('/datos-oc', getDatosOc);

export default router;
