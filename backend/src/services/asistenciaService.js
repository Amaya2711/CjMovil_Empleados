import { getConnection, sql } from '../db/mssql.js';

export const getAsistenciaService = async (idEmpleado) => {
  const pool = await getConnection();
  const request = pool.request();
  request.input('IdEmpleado', sql.VarChar(50), idEmpleado || '');
  const result = await request.execute('sp_Asistencia_ListarMes');
  const rows = result.recordset || [];
  return rows.map((row) => ({
    ...row,
    Estado:
      row.Estado ??
      row.estado ??
      row.EstadoMarcacion ??
      row.estadoMarcacion ??
      row.IdEstado ??
      row.idEstado ??
      '',
  }));
};

export const registerAsistenciaService = async ({ idEmpleado, tipo, lat, lon }) => {
  const pool = await getConnection();
  const request = pool.request();
  request.input('IdEmpleado', sql.VarChar(50), idEmpleado || '');
  request.input('Tipo', sql.VarChar(20), tipo || '');
  if (typeof lat !== 'undefined') request.input('Lat', sql.Decimal(18, 10), lat);
  if (typeof lon !== 'undefined') request.input('Lon', sql.Decimal(18, 10), lon);
  // Ajuste: nombre del SP asume convención; si no existe, el DBA deberá adaptarlo
  const result = await request.execute('sp_Asistencia_Registrar');
  return result.recordset || result;
};
