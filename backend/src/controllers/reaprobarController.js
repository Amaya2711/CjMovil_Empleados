// Aprobar planilla desde re-aprobaciones
export const aprobarReaprobacion = async (req, res) => {
  try {
    const { ipLocal, CorFil, cIdSite, IdEst, IdResponsable, txtOb, cIdRegularizar, IdReAprobador } = req.body;
    if (!ipLocal || !CorFil || !cIdSite || IdEst === undefined || IdResponsable === undefined || txtOb === undefined || cIdRegularizar === undefined || IdReAprobador === undefined) {
      return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }
    console.log('Ejecutando sp_Movil_ReAprobarPlanilla con:', {
      ipLocal: String(ipLocal),
      CorFil: parseInt(CorFil, 10),
      cIdsite: String(cIdSite),
      IdEst: parseInt(IdEst, 10),
      IdResponsable: parseInt(IdResponsable, 10),
      txtOb: String(txtOb),
      cIdRegularizar: parseInt(cIdRegularizar, 10),
      IdReAprobador: parseInt(IdReAprobador, 10)
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
    request.input('IdReAprobador', sql.Int, parseInt(IdReAprobador, 10));
    const result = await request.execute('sp_Movil_ReAprobarPlanilla');
    const debugMensaje = result.recordsets && result.recordsets[0] && result.recordsets[0][0] && result.recordsets[0][0].DebugMensaje;
    const sqlDebug = result.recordset && result.recordset[0] && result.recordset[0].SqlEjecutado;
    res.json({ success: true, debugMensaje, sqlDebug, result: result.recordset });
  } catch (error) {
    console.error('Error al aprobar planilla (reaprobacion):', error);
    res.status(500).json({ message: 'Error al aprobar planilla (reaprobacion)', error: error.message });
  }
};
import { getConnection, sql } from '../db/mssql.js';

// Controlador para ejecutar el store sp_Planilla_Consulta_ReAprobacion

export const consultarReaprobaciones = async (req, res) => {
  try {
    const { IdSolicitante } = req.body;
    // El parámetro es opcional, puede ser null o un número
    console.log('Ejecutando sp_Planilla_Consulta_ReAprobacion con:', { IdSolicitante });
    const pool = await getConnection();
    const request = pool.request();
    request.input('IdSolicitante', sql.Int, IdSolicitante === undefined ? null : IdSolicitante);
    const result = await request.execute('sp_Planilla_Consulta_ReAprobacion');
    res.json({ success: true, result: result.recordset });
  } catch (error) {
    console.error('Error al consultar reaprobaciones:', error);
    res.status(500).json({ message: 'Error al consultar reaprobaciones', error: error.message });
  }
};
