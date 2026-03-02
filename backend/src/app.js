import express from 'express';
import cors from 'cors';


import aprobacionRoutes from './routes/aprobacion.js';
import solicitanteRoutes from './routes/solicitanteRoutes.js';
import datosocRoutes from './routes/datosOc.js';
import planillaRoutes from './routes/planilla.js';
import reaprobacionesRoutes from './routes/reaprobaciones.js';
import reportesRoutes from './routes/reportes.js';
import gastosRoutes from './routes/gastos.js';
import asistenciaRoutes from './routes/asistencia.js';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas

app.use('/api', aprobacionRoutes);
app.use('/api', solicitanteRoutes);
app.use('/api', datosocRoutes);
app.use('/api', planillaRoutes);

// Asistencia
app.use('/api', asistenciaRoutes);

// Nueva ruta para reaprobaciones
app.use('/api/Reaprobaciones', reaprobacionesRoutes);
app.use('/api', reportesRoutes);
app.use('/api', gastosRoutes);

export default app;
