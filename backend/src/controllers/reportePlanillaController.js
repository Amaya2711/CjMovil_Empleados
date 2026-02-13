import { getConnection, sql } from '../db/mssql.js';

export const reportePlanillaDinamico = async (req, res) => {
  console.log('Solicitud recibida en reportePlanillaDinamico');
  try {
    const { Proyecto, Cliente, Moneda, Estado } = req.body;
    const pool = await getConnection();
    const request = pool.request();
    // Siempre ejecutar sp_ReportePlanillaDinamico, con o sin parámetros
    request.input('Proyecto', sql.VarChar(200), Proyecto || null);
    request.input('Cliente', sql.VarChar(200), Cliente || null);
    request.input('Moneda', sql.Int, Moneda !== undefined && Moneda !== '' ? Moneda : null);
    request.input('Estado', sql.Int, Estado !== undefined && Estado !== '' ? Estado : null);
    const result = await request.execute('sp_ReportePlanillaDinamico');
    res.json({ success: true, result: result.recordset });
  } catch (error) {
    console.error('Error en reportePlanillaDinamico:', error);
    console.error(error);
    res.status(500).json({ message: 'Error al obtener el reporte dinámico', error: error.message });
  }
};
