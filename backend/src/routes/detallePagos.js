import express from 'express';
import { getConnection, sql } from '../db/mssql.js';

const router = express.Router();

// POST /api/reportes/detalle-pagos
router.post('/', async (req, res) => {
  const { pProyecto, Ano, page = 1, pageSize = 10 } = req.body;
  console.log('DetallePagos - INICIO - Proyecto:', pProyecto, 'Año:', Ano, 'page:', page, 'pageSize:', pageSize);
  console.log('DetallePagos - PARAMS RAW:', JSON.stringify(req.body));
  try {
    const pool = await getConnection();
    const request = pool.request();
    if (pProyecto) request.input('pProyecto', sql.VarChar(200), pProyecto);
    // No pasar Ano al SP, filtramos después
    console.log('DetallePagos - Ejecutando SP sp_Planilla_Consulta_Gastos_Pagados con params:', { pProyecto });
    const result = await request.execute('sp_Planilla_Consulta_Gastos_Pagados');
    let allRows = result.recordset;
    // Filtrar por años seleccionados usando el campo FechaDeposito
    if (Ano) {
      const anosArr = String(Ano)
        .split(',')
        .map(a => Number(a))
        .filter(a => !isNaN(a));
      function parseDDMMYYYY(fechaStr) {
        if (!fechaStr || typeof fechaStr !== 'string') return null;
        const [day, month, year] = fechaStr.split('/');
        if (!day || !month || !year) return null;
        return new Date(`${year}-${month}-${day}`);
      }
      if (anosArr.length > 0) {
        allRows = allRows.filter(row => {
          if (!row.FechaDeposito) return false;
          const fecha = parseDDMMYYYY(row.FechaDeposito);
          if (!fecha || isNaN(fecha.getTime())) return false;
          const anio = fecha.getFullYear();
          return anosArr.includes(anio);
        });
      }
    }
    // Ordenar por Corre descendente (más reciente primero)
    allRows.sort((a, b) => Number(b.Corre) - Number(a.Corre));
    const total = allRows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedRows = allRows.slice(start, end);
    console.log('DetallePagos - SP ejecutado, filas retornadas:', total, 'Enviando:', paginatedRows.length);
    res.json({ result: paginatedRows, total });
  } catch (error) {
    console.error('DetallePagos error:', error);
    res.status(500).json({ error: true, message: error.message, details: error });
  }
});

export default router;
