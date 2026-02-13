import express from 'express';
import { getAsistencia, registerAsistencia } from '../controllers/asistenciaController.js';

const router = express.Router();

// GET /api/asistencia?codEmp=...
router.get('/asistencia', getAsistencia);
// POST /api/asistencia/register
router.post('/asistencia/register', registerAsistencia);

export default router;
