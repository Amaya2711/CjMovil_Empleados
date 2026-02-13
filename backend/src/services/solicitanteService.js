import { getConnection } from '../db/mssql.js';

export const getSolicitantesService = async () => {
  const pool = await getConnection();
  const result = await pool.request().execute('sp_BuscarSolicitantes');
  return result.recordset;
};
