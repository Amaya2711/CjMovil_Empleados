const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { getConnection } = require('../db');

// POST /api/reportes/detalle-pagos
router.post('/', async (req, res) => {
  const { pProyecto, Ano } = req.body;
  try {
    const pool = await getConnection();
    const request = pool.request();
    if (pProyecto) request.input('pProyecto', sql.VarChar(200), pProyecto);
    if (Ano) request.input('Ano', sql.Int, Ano);
    const result = await request.execute('sp_Planilla_Consulta_Gastos_Pagados');
    res.json({ result: result.recordset });
  } catch (error) {
    res.status(500).json({ error: true, message: error.message });
  }
});

module.exports = router;
