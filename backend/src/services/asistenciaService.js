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

export const registerAsistenciaService = async ({ usuarioAct, tipo, lat, lon, outOfRange = false }) => {
  const pool = await getConnection();
  const usuarioActRaw = String(usuarioAct ?? '').trim();
  if (!/^\d+$/.test(usuarioActRaw)) {
    throw new Error('UsuarioAct inválido para sp_Asistencia_Marcar');
  }
  const usuarioActNumber = Number.parseInt(usuarioActRaw, 10);
  const tipoValue = tipo === null || typeof tipo === 'undefined'
    ? ''
    : String(tipo).trim().toUpperCase();
  const pEnvio = tipoValue === 'SALIDA' ? 2 : 1;
  const latNumber = (lat === null || typeof lat === 'undefined' || String(lat).trim() === '') ? null : Number(lat);
  const lonNumber = (lon === null || typeof lon === 'undefined' || String(lon).trim() === '') ? null : Number(lon);
  const latValue = Number.isFinite(latNumber) ? latNumber : null;
  const lonValue = Number.isFinite(lonNumber) ? lonNumber : null;
  const outOfRangeValue = !!outOfRange;

  const executeRegister = async (includeEstadoParams) => {
    const request = pool.request();
    request.input('UsuarioAct', sql.Int, usuarioActNumber);
    request.input('pEnvio', sql.Int, pEnvio);
    if (pEnvio === 2) {
      request.input('LatitudSalida', sql.Decimal(18, 6), latValue);
      request.input('LongitudSalida', sql.Decimal(18, 6), lonValue);
      if (includeEstadoParams) {
        request.input('EstadoSalida', sql.Int, outOfRangeValue ? 9 : 0);
      }
    } else {
      request.input('Latitud', sql.Decimal(18, 6), latValue);
      request.input('Longitud', sql.Decimal(18, 6), lonValue);
      if (includeEstadoParams) {
        request.input('EstadoMarcacion', sql.Int, outOfRangeValue ? 9 : 0);
      }
    }
    return request.execute('sp_Asistencia_Marcar');
  };

  console.log('[registerAsistenciaService] usuarioAct=%d tipo=%s pEnvio=%d lat=%s lon=%s outOfRange=%s', usuarioActNumber, tipoValue || 'N/A', pEnvio, latValue ?? 'N/A', lonValue ?? 'N/A', outOfRangeValue);
  const result = await executeRegister(true);
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
