import { getConnection, sql } from '../db/mssql.js';

// Obtiene el offset de zona horaria actual del servidor en minutos
// Ej: UTC-5 (Perú) = 300 minutos
const getServerTimezoneOffset = () => {
  const offset = -(new Date().getTimezoneOffset());
  console.log(`[getServerTimezoneOffset] Zona horaria del servidor: UTC${offset > 0 ? '+' : ''}${offset / 60}`);
  return offset;
};

// Simplemente devuelve la hora tal cual está en SQL
// Sin intentar convertir, para evitar problemas con zonas horarias inesperadas
const formatTimeFromSQL = (value) => {
  if (!value && value !== 0) return '';
  
  try {
    // Si ya es string en formato HH:mm:ss
    if (typeof value === 'string' && /^\d{2}:\d{2}:\d{2}/.test(value)) {
      return value.split('.')[0]; // Eliminar milisegundos
    }
    
    // Si es Date o timestamp, formatear como HH:mm:ss
    if (value instanceof Date || typeof value === 'number') {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return String(value);
      
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }
    
    return String(value);
  } catch (e) {
    console.error(`[formatTimeFromSQL] Error: ${e.message}`);
    return String(value);
  }
};

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

export const registerAsistenciaService = async ({ usuarioAct, tipo, lat, lon, comentario, estadoMarcacion, estadoSalida }) => {
  const pool = await getConnection();
  const request = pool.request();
  const usuarioActNumber = Number.parseInt(String(usuarioAct ?? '').trim(), 10);
  if (!Number.isFinite(usuarioActNumber)) {
    throw new Error('UsuarioAct inválido para sp_Asistencia_Marcar');
  }
  const tipoValue = tipo === null || typeof tipo === 'undefined'
    ? ''
    : String(tipo).trim().toUpperCase();
  const pEnvio = tipoValue === 'SALIDA' ? 2 : 1;
  const latNumber = (lat === null || typeof lat === 'undefined' || String(lat).trim() === '') ? null : Number(lat);
  const lonNumber = (lon === null || typeof lon === 'undefined' || String(lon).trim() === '') ? null : Number(lon);
  const latValue = Number.isFinite(latNumber) ? latNumber : null;
  const lonValue = Number.isFinite(lonNumber) ? lonNumber : null;

  const comentarioValue = comentario === null || typeof comentario === 'undefined' ? null : String(comentario).slice(0, 250);
  const estadoMarcacionValue = Number.isFinite(Number(estadoMarcacion)) ? Number(estadoMarcacion) : 1;
  const estadoSalidaValue = Number.isFinite(Number(estadoSalida)) ? Number(estadoSalida) : 1;

  console.log('[registerAsistenciaService] usuarioAct=%d tipo=%s pEnvio=%d lat=%s lon=%s comentario=%s estadoMarcacion=%d estadoSalida=%d', usuarioActNumber, tipoValue || 'N/A', pEnvio, latValue ?? 'N/A', lonValue ?? 'N/A', comentarioValue ?? 'N/A', estadoMarcacionValue, estadoSalidaValue);
  request.input('UsuarioAct', sql.Int, usuarioActNumber);
  request.input('pEnvio', sql.Int, pEnvio);
  request.input('Comentario', sql.NVarChar(250), comentarioValue);
  if (pEnvio === 2) {
    request.input('LatitudSalida', sql.Decimal(18, 6), latValue);
    request.input('LongitudSalida', sql.Decimal(18, 6), lonValue);
    request.input('EstadoSalida', sql.Int, estadoSalidaValue);
  } else {
    request.input('Latitud', sql.Decimal(18, 6), latValue);
    request.input('Longitud', sql.Decimal(18, 6), lonValue);
    request.input('EstadoMarcacion', sql.Int, estadoMarcacionValue);
  }
  const result = await request.execute('sp_Asistencia_Marcar');
  const rows = result.recordset || [];
  
  // No convertir, dejar tal cual para que el cliente lo interprete
  return rows;
};

export const cargarListadoDiarioService = async (usuarioCre) => {
  const pool = await getConnection();
  const request = pool.request();
  const usuarioCreValue = usuarioCre === null || typeof usuarioCre === 'undefined'
    ? ''
    : String(usuarioCre).trim();
  request.input('usuarioCre', sql.VarChar(50), usuarioCreValue);
  const result = await request.execute('sp_CargarListadoDiario');
  const rows = result.recordset || [];
  
  // No convertir, dejar tal cual para que el cliente lo interprete
  return rows;
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
