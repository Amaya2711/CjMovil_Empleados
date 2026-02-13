import { getConnection, sql } from '../db/mssql.js';

export const getAsistenciaService = async (idEmpleado, fechaAsistencia) => {
  const pool = await getConnection();
  const request = pool.request();
  let fecha = null;
  if (fechaAsistencia) {
    const parsed = new Date(fechaAsistencia);
    if (!Number.isNaN(parsed.getTime())) fecha = parsed;
  }
  if (!fecha) fecha = new Date();
  request.input('IdEmpleado', sql.VarChar(50), idEmpleado || '');
  request.input('FechaAsistencia', sql.Date, fecha);
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

export const registerAsistenciaService = async ({ usuarioAct }) => {
  const pool = await getConnection();
  const request = pool.request();
  const usuarioActValue = usuarioAct === null || typeof usuarioAct === 'undefined'
    ? ''
    : String(usuarioAct).trim();
  request.input('UsuarioAct', sql.VarChar(50), usuarioActValue);
  const result = await request.execute('sp_Asistencia_ActualizarEstado');
  return result.recordset || result;
};

export const cargarListadoDiarioService = async (usuarioCre) => {
  const pool = await getConnection();
  const request = pool.request();
  const usuarioCreValue = usuarioCre === null || typeof usuarioCre === 'undefined'
    ? ''
    : String(usuarioCre).trim();
  request.input('usuarioCre', sql.VarChar(50), usuarioCreValue);
  const result = await request.execute('sp_CargarListadoDiario');
  return result.recordset || [];
};

export const constanteOficinasService = async () => {
  const pool = await getConnection();
  const request = pool.request();
  const result = await request.execute('sp_Constante_Oficinas');
  return result.recordset || [];
};

export const eliminarAsistenciaPruebaService = async () => {
  const pool = await getConnection();
  const request = pool.request();
  const result = await request.execute('sp_Asistencia_Eliminar_Prueba');
  return result.recordset || result;
};
