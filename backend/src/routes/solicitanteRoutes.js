import express from 'express';
import { getSolicitantes } from '../controllers/solicitanteController.js';

const router = express.Router();

router.get('/solicitantes', getSolicitantes);

export default router;
