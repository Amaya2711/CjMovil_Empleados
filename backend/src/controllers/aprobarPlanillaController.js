
import { getConnection, sql } from '../db/mssql.js';

// Controlador para ejecutar el store sp_Movil_AprobarPlanilla
export const aprobarPlanilla = async (req, res) => {
  try {
    const { ipLocal, CorFil, cIdSite, IdEst, IdResponsable, txtOb, cIdRegularizar } = req.body;
    if (!ipLocal || !CorFil || !cIdSite || IdEst === undefined || IdResponsable === undefined || txtOb === undefined || cIdRegularizar === undefined) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos' });
    }
    console.log('Ejecutando sp_Movil_AprobarPlanilla con:', {
      ipLocal: String(ipLocal),
      CorFil: parseInt(CorFil, 10),
      cIdsite: String(cIdSite),
      IdEst: parseInt(IdEst, 10),
      IdResponsable: parseInt(IdResponsable, 10),
      txtOb: String(txtOb),
      cIdRegularizar: parseInt(cIdRegularizar, 10)
    });
    const pool = await getConnection();
    const request = pool.request();
    request.input('ipLocal', sql.VarChar(50), String(ipLocal));
    request.input('CorFil', sql.Int, parseInt(CorFil, 10));
    request.input('cIdsite', sql.VarChar(50), String(cIdSite));
    request.input('IdEst', sql.Int, parseInt(IdEst, 10));
    request.input('IdResponsable', sql.Int, parseInt(IdResponsable, 10));
    request.input('txtOb', sql.VarChar(200), String(txtOb));
    request.input('cIdRegularizar', sql.Int, parseInt(cIdRegularizar, 10));
    const result = await request.execute('sp_Movil_AprobarPlanilla');
    // Captura el mensaje de debug del primer SELECT
    const debugMensaje = result.recordsets && result.recordsets[0] && result.recordsets[0][0] && result.recordsets[0][0].DebugMensaje;
    const sqlDebug = result.recordset && result.recordset[0] && result.recordset[0].SqlEjecutado;
    res.json({ success: true, debugMensaje, sqlDebug, result: result.recordset });
  } catch (error) {
    console.error('Error al aprobar planilla:', error);
    res.status(500).json({ message: 'Error al aprobar planilla', error: error.message });
  }
};
