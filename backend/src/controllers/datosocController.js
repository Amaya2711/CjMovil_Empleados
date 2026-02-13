import { getConnection, sql } from '../db/mssql.js';

export const getDatosOc = async (req, res) => {
  try {
    const { idoc, fila, IdSite, Tipo_Trabajo } = req.body;
    // Si fila es array, tomar solo el primer valor. Si es string con comas, tomar el primer valor. Si es número, usar directo.
    let filaValue = fila;
    if (Array.isArray(fila)) {
      filaValue = fila.length > 0 ? fila[0] : 0;
    } else if (typeof fila === 'string' && fila.includes(',')) {
      filaValue = fila.split(',')[0].trim();
    }
    // Si filaValue es '', null o undefined, usar 0
    if (filaValue === '' || filaValue === null || filaValue === undefined) filaValue = 0;
    // Si idoc es '', null o undefined, usar 0
    let idocValue = idoc;
    if (idocValue === '' || idocValue === null || idocValue === undefined) idocValue = 0;
    console.log('[Datos OC] Parámetros recibidos:', { idoc: idocValue, fila: filaValue, IdSite, Tipo_Trabajo });
    const pool = await getConnection();
    const request = pool.request();
    request.input('pIdOC', sql.Int, Number(idocValue));
    request.input('pFila', sql.Int, Number(filaValue));
    request.input('pIdSite', sql.VarChar, IdSite || null);
    request.input('pIdTipo', sql.VarChar, Tipo_Trabajo || null);
    const result = await request.execute('sp_OrdenCompra_PorcentajePlanilla');
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al consultar datos OC:', error);
    res.status(500).json({ message: 'Error al consultar datos OC', error: error.message });
  }
};
