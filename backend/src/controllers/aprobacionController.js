import { getConnection, sql } from '../db/mssql.js';

export const getAprobaciones = async (req, res) => {
  try {
    const pool = await getConnection();
    // Obtener y convertir los parámetros
    let idSolicitante = req.query.IdSolicitante;
    let idValidador = req.query.IdValidador;
    if (idSolicitante !== undefined && idSolicitante !== null && idSolicitante !== '') {
      idSolicitante = parseInt(idSolicitante, 10);
      if (isNaN(idSolicitante)) idSolicitante = null;
    } else {
      idSolicitante = null;
    }
    if (idValidador !== undefined && idValidador !== null && idValidador !== '') {
      idValidador = parseInt(idValidador, 10);
      if (isNaN(idValidador)) idValidador = null;
    } else {
      idValidador = null;
    }
    const request = pool.request();
    request.input('IdSolicitante', sql.Int, idSolicitante);
    // Solo enviar IdValidador si está definido
    if (idValidador !== null) {
      request.input('IdValidador', sql.Int, idValidador);
    }
    const result = await request.execute('sp_Planilla_Consulta_Aprobacion');
    console.log('Resultado SP sp_Planilla_Consulta_Aprobacion:', JSON.stringify(result));
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al consultar aprobaciones:', error);
    res.status(500).json({ message: 'Error al consultar aprobaciones', error: error.message });
  }
};
