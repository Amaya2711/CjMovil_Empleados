import { getConnection, sql } from '../db/mssql.js';

// Convierte un datetime de SQL Server a zona horaria de Perú (UTC-5)
// Funciona independientemente de la zona horaria del servidor
const convertToLimaTime = (value) => {
  if (!value && value !== 0) return '';
  
  try {
    // Si ya es string en formato HH:mm:ss, devolver tal cual
    if (typeof value === 'string' && /^\d{2}:\d{2}:\d{2}/.test(value)) {
      const cleaned = value.split('.')[0]; // Eliminar milisegundos si existen
      console.log(`[convertToLimaTime] Ya está en formato HH:mm:ss: ${value} → ${cleaned}`);
      return cleaned;
    }
    
    // Si es Date o timestamp (número)
    if (value instanceof Date || typeof value === 'number') {
      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) return String(value);
      
      // SQL Server guarda en UTC, necesitamos convertir a Lima (UTC-5)
      // date.getTime() está en UTC
      // date.getTimezoneOffset() es la diferencia en minutos de la zona local respecto a UTC
      // Ej: si servidor está en UTC-3, getTimezoneOffset() = 180 (3*60)
      // Si servidor está en UTC, getTimezoneOffset() = 0
      // Si servidor está en UTC+2, getTimezoneOffset() = -120 (-2*60)
      
      // Convertir a Lima (UTC-5):
      // 1. Sumar el offset del servidor para obtener UTC puro
      // 2. Restar 5 horas para obtener Lima
      const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
      const limaMs = utcMs - (5 * 60 * 60 * 1000); // Restar 5 horas (UTC-5)
      const limaTime = new Date(limaMs);
      
      const hh = String(limaTime.getUTCHours()).padStart(2, '0');
      const mm = String(limaTime.getUTCMinutes()).padStart(2, '0');
      const ss = String(limaTime.getUTCSeconds()).padStart(2, '0');
      const result = `${hh}:${mm}:${ss}`;
      
      console.log(`[convertToLimaTime] Timestamp: ${value} → ${result}`);
      return result;
    }
    
    // Si es otro tipo, intentar convertir a Date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const utcMs = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
      const limaMs = utcMs - (5 * 60 * 60 * 1000);
      const limaTime = new Date(limaMs);
      
      const hh = String(limaTime.getUTCHours()).padStart(2, '0');
      const mm = String(limaTime.getUTCMinutes()).padStart(2, '0');
      const ss = String(limaTime.getUTCSeconds()).padStart(2, '0');
      const result = `${hh}:${mm}:${ss}`;
      
      console.log(`[convertToLimaTime] String: ${value} → ${result}`);
      return result;
    }
    
    return String(value);
  } catch (e) {
    console.error(`[convertToLimaTime] Error procesando ${value}:`, e.message);
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
  return rows.map((row) => {
    // Convertir campos de hora a zona horaria Lima
    const horaFields = ['Hora', 'hora', 'HoraCreacion', 'horaCreacion', 'HoraSalida', 'horaSalida'];
    const processedRow = { ...row };
    
    horaFields.forEach(field => {
      if (field in processedRow && processedRow[field]) {
        processedRow[field] = convertToLimaTime(processedRow[field]);
      }
    });
    
    return {
      ...processedRow,
      Estado:
        row.Estado ??
        row.estado ??
        row.EstadoMarcacion ??
        row.estadoMarcacion ??
        row.IdEstado ??
        row.idEstado ??
        '',
    };
  });
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
  
  // Convertir campos de hora a zona horaria Lima en los resultados
  return rows.map((row) => {
    const horaFields = ['Hora', 'hora', 'HoraCreacion', 'horaCreacion', 'HoraSalida', 'horaSalida'];
    const processedRow = { ...row };
    
    horaFields.forEach(field => {
      if (field in processedRow && processedRow[field]) {
        processedRow[field] = convertToLimaTime(processedRow[field]);
      }
    });
    
    return processedRow;
  });
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
  
  // Convertir campos de hora a zona horaria Lima en los resultados
  return rows.map((row) => {
    const horaFields = ['Hora', 'hora', 'HoraCreacion', 'horaCreacion', 'HoraSalida', 'horaSalida'];
    const processedRow = { ...row };
    
    horaFields.forEach(field => {
      if (field in processedRow && processedRow[field]) {
        processedRow[field] = convertToLimaTime(processedRow[field]);
      }
    });
    
    return processedRow;
  });
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
