import express from 'express';
import { cargarListadoDiario, eliminarAsistenciaPrueba, getAsistencia, getConstanteOficinas, registerAsistencia } from '../controllers/asistenciaController.js';

const router = express.Router();

// GET /api/asistencia?codEmp=...
router.get('/asistencia', getAsistencia);
// POST /api/asistencia/register
router.post('/asistencia/register', registerAsistencia);
// POST /api/asistencia/listado-diario
router.post('/asistencia/listado-diario', cargarListadoDiario);
// GET /api/asistencia/constante-oficinas
router.get('/asistencia/constante-oficinas', getConstanteOficinas);
// POST /api/asistencia/eliminar-prueba
router.post('/asistencia/eliminar-prueba', eliminarAsistenciaPrueba);

export default router;
