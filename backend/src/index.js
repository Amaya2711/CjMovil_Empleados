import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
console.log('Archivos en backend:', fs.readdirSync('.'));
import authRoutes from './routes/auth.js';
import aprobacionRoutes from './routes/aprobacion.js';
import solicitanteRoutes from './routes/solicitanteRoutes.js';
import datosocRoutes from './routes/datosOc.js';
import detallePagosRoutes from './routes/detallePagos.js';

import aprobarPlanillaRoutes from './routes/aprobarPlanilla.js';
import reaprobacionesRoutes from './routes/reaprobaciones.js';
import gastosRoutes from './routes/gastos.js';
import asistenciaRoutes from './routes/asistencia.js';

dotenv.config();

// Validar configuración de SharePoint al iniciar el servidor
console.log('========================================');
console.log('📋 VALIDACIÓN DE VARIABLES DE ENTORNO:');
console.log('========================================');
console.log('PORT:', process.env.PORT || 'NO CONFIGURADO (usando 4000)');
console.log('SQLSERVER_HOST:', process.env.SQLSERVER_HOST ? '✓ Configurado' : '✗ NO CONFIGURADO');
console.log('SQLSERVER_DB:', process.env.SQLSERVER_DB ? '✓ Configurado' : '✗ NO CONFIGURADO');
console.log('');
console.log('🔐 SHAREPOINT CREDENTIALS:');
console.log('SHAREPOINT_CLIENT_ID:', process.env.SHAREPOINT_CLIENT_ID ? `✓ ${process.env.SHAREPOINT_CLIENT_ID}` : '✗ NO CONFIGURADO');
console.log('SHAREPOINT_CLIENT_SECRET:', process.env.SHAREPOINT_CLIENT_SECRET ? `✓ ${process.env.SHAREPOINT_CLIENT_SECRET.substring(0, 10)}...` : '✗ NO CONFIGURADO');
console.log('SHAREPOINT_TENANT_ID:', process.env.SHAREPOINT_TENANT_ID ? `✓ ${process.env.SHAREPOINT_TENANT_ID}` : '✗ NO CONFIGURADO');
console.log('========================================');
console.log('');

const app = express();
app.use(cors());
app.use(express.json());



app.use('/api/auth', authRoutes);

app.use('/api/aprobaciones', aprobacionRoutes);
app.use('/api', solicitanteRoutes);
app.use('/api', datosocRoutes);
app.use('/api', aprobarPlanillaRoutes);
app.use('/api', gastosRoutes);
app.use('/api/reportes/detalle-pagos', detallePagosRoutes);

// Nueva ruta para reaprobaciones
app.use('/api/Reaprobaciones', reaprobacionesRoutes);

// Asistencia
app.use('/api', asistenciaRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API backend funcionando' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Ruta API no encontrada' });
});

console.log('Valor de process.env.PORT:', process.env.PORT);
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend escuchando en puerto ${PORT} (0.0.0.0)`);
});
