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
  request.input('IdEmpleado', sql.VarChar(50), idEmpleado || '');
  request.input('FechaAsistencia', sql.Date, fecha);
  const result = await request.execute('sp_Asistencia_ListarMes');
  const rows = result.recordset || [];
  return rows.map((row) => {
    // Normalizar TiempoTrabajado: convertir a string en formato HH:mm:ss si es necesario
    let tiempoTrabajadoFormatted = '';
    if (row.TiempoTrabajado || row.tiempoTrabajado) {
      const tiempoVal = row.TiempoTrabajado ?? row.tiempoTrabajado;
      if (typeof tiempoVal === 'string' && /^\d{2}:\d{2}:\d{2}/.test(tiempoVal)) {
        tiempoTrabajadoFormatted = tiempoVal.split('.')[0];
      } else if (tiempoVal instanceof Date || typeof tiempoVal === 'number') {
        const date = tiempoVal instanceof Date ? tiempoVal : new Date(tiempoVal);
        if (!isNaN(date.getTime())) {
          const hh = String(date.getHours()).padStart(2, '0');
          const mm = String(date.getMinutes()).padStart(2, '0');
          const ss = String(date.getSeconds()).padStart(2, '0');
          tiempoTrabajadoFormatted = `${hh}:${mm}:${ss}`;
        }
      }
    }
    
    return {
      ...row,
      TiempoTrabajado: tiempoTrabajadoFormatted,
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

export const registerAsistenciaService = async ({ usuarioAct, tipo, lat, lon, comentario, estadoMarcacion, estadoSalida, imagen }) => {
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
  const imagenValue = imagen === null || typeof imagen === 'undefined' ? null : String(imagen).slice(0, 250);
  const estadoMarcacionValue = Number.isFinite(Number(estadoMarcacion)) ? Number(estadoMarcacion) : 1;
  const estadoSalidaValue = Number.isFinite(Number(estadoSalida)) ? Number(estadoSalida) : 1;

  console.log('[registerAsistenciaService] usuarioAct=%d tipo=%s pEnvio=%d lat=%s lon=%s comentario=%s imagen=%s estadoMarcacion=%d estadoSalida=%d', usuarioActNumber, tipoValue || 'N/A', pEnvio, latValue ?? 'N/A', lonValue ?? 'N/A', comentarioValue ?? 'N/A', imagenValue ?? 'N/A', estadoMarcacionValue, estadoSalidaValue);
  request.input('UsuarioAct', sql.Int, usuarioActNumber);
  request.input('pEnvio', sql.Int, pEnvio);
  request.input('Comentario', sql.NVarChar(250), comentarioValue);
  
  // Separar parámetro de imagen según tipo
  if (pEnvio === 2) {
    // SALIDA: usa ImagenSalida
    request.input('ImagenSalida', sql.NVarChar(250), imagenValue);
    request.input('LatitudSalida', sql.Decimal(18, 6), latValue);
    request.input('LongitudSalida', sql.Decimal(18, 6), lonValue);
    request.input('EstadoSalida', sql.Int, estadoSalidaValue);
  } else {
    // INGRESO: usa Imagen
    request.input('Imagen', sql.NVarChar(250), imagenValue);
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

export const startAsistenciaTrackingSessionService = async ({
  usuarioAct,
  codEmp,
  fechaAsistencia,
  plataforma,
  latitudIngreso,
  longitudIngreso,
  accuracyIngreso,
}) => {
  const pool = await getConnection();
  const fechaValue = fechaAsistencia ? new Date(fechaAsistencia) : new Date();
  const codEmpValue = String(codEmp || usuarioAct || '').trim();
  const usuarioActValue = Number.isFinite(Number(usuarioAct)) ? Number(usuarioAct) : null;
  const plataformaValue = String(plataforma || '').trim().slice(0, 20) || null;
  const latitudValue = Number.isFinite(Number(latitudIngreso)) ? Number(latitudIngreso) : null;
  const longitudValue = Number.isFinite(Number(longitudIngreso)) ? Number(longitudIngreso) : null;
  const accuracyValue = Number.isFinite(Number(accuracyIngreso)) ? Number(accuracyIngreso) : null;

  const existingRequest = pool.request();
  existingRequest.input('CodEmp', sql.VarChar(50), codEmpValue);
  existingRequest.input('FechaAsistencia', sql.Date, fechaValue);
  const existing = await existingRequest.query(`
    SELECT TOP (1) SesionId
    FROM dbo.AsistenciaTrackingSesion
    WHERE CodEmp = @CodEmp
      AND FechaAsistencia = @FechaAsistencia
      AND Estado = 'ACTIVO'
    ORDER BY SesionId DESC
  `);

  const existingSessionId = existing.recordset?.[0]?.SesionId ?? null;
  if (existingSessionId) {
    return { sessionId: existingSessionId, reused: true };
  }

  const insertRequest = pool.request();
  insertRequest.input('CodEmp', sql.VarChar(50), codEmpValue);
  insertRequest.input('UsuarioAct', sql.Int, usuarioActValue);
  insertRequest.input('FechaAsistencia', sql.Date, fechaValue);
  insertRequest.input('Plataforma', sql.VarChar(20), plataformaValue);
  insertRequest.input('LatitudIngreso', sql.Decimal(18, 6), latitudValue);
  insertRequest.input('LongitudIngreso', sql.Decimal(18, 6), longitudValue);
  insertRequest.input('AccuracyIngreso', sql.Decimal(18, 6), accuracyValue);
  const inserted = await insertRequest.query(`
    INSERT INTO dbo.AsistenciaTrackingSesion
      (CodEmp, UsuarioAct, FechaAsistencia, Plataforma, LatitudIngreso, LongitudIngreso, AccuracyIngreso, Estado, FechaHoraIngreso)
    OUTPUT INSERTED.SesionId
    VALUES
      (@CodEmp, @UsuarioAct, @FechaAsistencia, @Plataforma, @LatitudIngreso, @LongitudIngreso, @AccuracyIngreso, 'ACTIVO', SYSDATETIME())
  `);

  return {
    sessionId: inserted.recordset?.[0]?.SesionId ?? null,
    reused: false,
  };
};

export const saveAsistenciaTrackingPointsBatchService = async ({
  sessionId,
  points,
}) => {
  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    let insertedCount = 0;
    for (const point of points) {
      const request = new sql.Request(transaction);
      request.input('SesionId', sql.BigInt, Number(sessionId));
      request.input('FechaHora', sql.DateTime2, point?.fechaHora ? new Date(point.fechaHora) : new Date());
      request.input('Latitud', sql.Decimal(18, 6), Number(point?.latitud));
      request.input('Longitud', sql.Decimal(18, 6), Number(point?.longitud));
      request.input('Accuracy', sql.Decimal(18, 6), Number.isFinite(Number(point?.accuracy)) ? Number(point.accuracy) : null);
      request.input('Speed', sql.Decimal(18, 6), Number.isFinite(Number(point?.speed)) ? Number(point.speed) : null);
      request.input('Heading', sql.Decimal(18, 6), Number.isFinite(Number(point?.heading)) ? Number(point.heading) : null);
      request.input('Source', sql.VarChar(50), String(point?.source || 'background-task').slice(0, 50));
      await request.query(`
        INSERT INTO dbo.AsistenciaTrackingPunto
          (SesionId, FechaHora, Latitud, Longitud, Accuracy, Speed, Heading, Source)
        VALUES
          (@SesionId, @FechaHora, @Latitud, @Longitud, @Accuracy, @Speed, @Heading, @Source)
      `);
      insertedCount += 1;
    }

    await transaction.commit();
    return { insertedCount };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export const stopAsistenciaTrackingSessionService = async ({
  sessionId,
  usuarioAct,
  codEmp,
  latitudSalida,
  longitudSalida,
  accuracySalida,
}) => {
  const pool = await getConnection();
  let sessionIdValue = Number.isFinite(Number(sessionId)) ? Number(sessionId) : null;

  if (!sessionIdValue) {
    const request = pool.request();
    request.input('CodEmp', sql.VarChar(50), String(codEmp || usuarioAct || '').trim());
    const result = await request.query(`
      SELECT TOP (1) SesionId
      FROM dbo.AsistenciaTrackingSesion
      WHERE CodEmp = @CodEmp
        AND Estado = 'ACTIVO'
      ORDER BY SesionId DESC
    `);
    sessionIdValue = result.recordset?.[0]?.SesionId ?? null;
  }

  if (!sessionIdValue) {
    return { updated: false, sessionId: null };
  }

  const request = pool.request();
  request.input('SesionId', sql.BigInt, sessionIdValue);
  request.input('LatitudSalida', sql.Decimal(18, 6), Number.isFinite(Number(latitudSalida)) ? Number(latitudSalida) : null);
  request.input('LongitudSalida', sql.Decimal(18, 6), Number.isFinite(Number(longitudSalida)) ? Number(longitudSalida) : null);
  request.input('AccuracySalida', sql.Decimal(18, 6), Number.isFinite(Number(accuracySalida)) ? Number(accuracySalida) : null);
  await request.query(`
    UPDATE dbo.AsistenciaTrackingSesion
    SET
      FechaHoraSalida = SYSDATETIME(),
      LatitudSalida = @LatitudSalida,
      LongitudSalida = @LongitudSalida,
      AccuracySalida = @AccuracySalida,
      Estado = 'FINALIZADO',
      UpdatedAt = SYSDATETIME()
    WHERE SesionId = @SesionId
  `);

  return { updated: true, sessionId: sessionIdValue };
};
