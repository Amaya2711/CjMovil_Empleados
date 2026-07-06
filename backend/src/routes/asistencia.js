import express from 'express';
import { cargarListadoDiario, eliminarAsistenciaPrueba, getAsistencia, getConstanteOficinas, registerAsistencia, saveAsistenciaTrackingPointsBatch, startAsistenciaTrackingSession, stopAsistenciaTrackingSession } from '../controllers/asistenciaController.js';

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
// POST /api/asistencia/tracking/session/start
router.post('/asistencia/tracking/session/start', startAsistenciaTrackingSession);
// POST /api/asistencia/tracking/points/batch
router.post('/asistencia/tracking/points/batch', saveAsistenciaTrackingPointsBatch);
// POST /api/asistencia/tracking/session/stop
router.post('/asistencia/tracking/session/stop', stopAsistenciaTrackingSession);

export default router;
