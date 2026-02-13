import { getConnection, sql } from '../db/mssql.js';

export const reporteGastos = async (req, res) => {
  try {
    // Puedes agregar filtros en el futuro si lo necesitas
    const pool = await getConnection();
    const request = pool.request();
    const result = await request.execute('sp_ReporteGastos');
    res.json({ success: true, result: result.recordset });
  } catch (error) {
    console.error('Error en reporteGastos:', error);
    res.status(500).json({ message: 'Error al obtener el reporte de gastos', error: error.message });
  }
};
