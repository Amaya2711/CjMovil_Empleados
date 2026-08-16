import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { registerAsistencia } from '../api/asistencia';
import { initLocalDatabase } from './initLocalDatabase.native';
import {
  startTrackingSession,
  stopTrackingSession,
} from '../features/asistenciaTracking/backgroundLocationTask';
import { ENABLE_BACKGROUND_LOCATION_TRACKING } from '../features/asistenciaTracking/config';

const DATABASE_NAME = 'cj_movil.db';
const QUEUE_TABLE = 'SyncPendiente';

let databasePromise = null;
let schemaPromise = null;

const getLimaDateTime = (timestamp = Date.now()) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values = {};
    parts.forEach((part) => {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    });

    if (values.year && values.month && values.day && values.hour && values.minute && values.second) {
      return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
    }
  } catch (error) {
    console.warn('[asistenciaSyncQueue][getLimaDateTime]', error?.message || error);
  }

  return date.toISOString();
};

const createLocalId = () => {
  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `asistencia-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
};

const getDatabaseAsync = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
};

const ensureSchemaAsync = async () => {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await initLocalDatabase();
      const db = await getDatabaseAsync();
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS ${QUEUE_TABLE} (
          IdLocal TEXT PRIMARY KEY NOT NULL,
          Modulo TEXT NOT NULL,
          Operacion TEXT NOT NULL,
          Payload TEXT NOT NULL,
          FechaRegistro TEXT NOT NULL,
          Intentos INTEGER NOT NULL DEFAULT 0,
          Sincronizado INTEGER NOT NULL DEFAULT 0,
          FechaSincronizacion TEXT NULL
        );

        CREATE INDEX IF NOT EXISTS IX_${QUEUE_TABLE}_Sincronizado_FechaRegistro
          ON ${QUEUE_TABLE} (Sincronizado, FechaRegistro);
      `);
      return db;
    })();
  }

  try {
    return await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

const normalizePayload = (payload = {}) => {
  const normalized = {
    usuarioAct: payload.usuarioAct ?? null,
    codEmp: payload.codEmp ?? null,
    tipo: payload.tipo ?? null,
    lat: Number.isFinite(Number(payload.lat)) ? Number(payload.lat) : null,
    lon: Number.isFinite(Number(payload.lon)) ? Number(payload.lon) : null,
    fechaAsistencia: payload.fechaAsistencia ?? null,
    comentario: typeof payload.comentario === 'string' ? payload.comentario.slice(0, 250) : payload.comentario ?? '',
    estadoMarcacion: payload.estadoMarcacion ?? null,
    estadoSalida: payload.estadoSalida ?? null,
    imagenBase64: payload.imagenBase64 ?? null,
    nombreImagen: payload.nombreImagen ?? null,
    fechaRegistroLocal: payload.fechaRegistroLocal ?? getLimaDateTime(),
  };

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => typeof value !== 'undefined')
  );
};

const insertPendingRecordAsync = async (db, record) => {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${QUEUE_TABLE} (
      IdLocal,
      Modulo,
      Operacion,
      Payload,
      FechaRegistro,
      Intentos,
      Sincronizado,
      FechaSincronizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.IdLocal,
      record.Modulo,
      record.Operacion,
      record.Payload,
      record.FechaRegistro,
      record.Intentos,
      record.Sincronizado,
      record.FechaSincronizacion,
    ]
  );
};

const getPendingRecordsAsync = async (db) => {
  return db.getAllAsync(
    `SELECT IdLocal, Modulo, Operacion, Payload, FechaRegistro, Intentos, Sincronizado, FechaSincronizacion
     FROM ${QUEUE_TABLE}
     WHERE Sincronizado = 0
     ORDER BY FechaRegistro ASC, IdLocal ASC`
  );
};

const getRecordByIdAsync = async (db, idLocal) => {
  return db.getFirstAsync(
    `SELECT IdLocal, Modulo, Operacion, Payload, FechaRegistro, Intentos, Sincronizado, FechaSincronizacion
     FROM ${QUEUE_TABLE}
     WHERE IdLocal = ?
     LIMIT 1`,
    [idLocal]
  );
};

const markAsSyncedAsync = async (db, idLocal) => {
  await db.runAsync(
    `UPDATE ${QUEUE_TABLE}
     SET Sincronizado = 1,
         FechaSincronizacion = ?
     WHERE IdLocal = ?`,
    [getLimaDateTime(), idLocal]
  );
};

const markAsFailedAsync = async (db, idLocal) => {
  await db.runAsync(
    `UPDATE ${QUEUE_TABLE}
     SET Intentos = COALESCE(Intentos, 0) + 1
     WHERE IdLocal = ?`,
    [idLocal]
  );
};

const trySyncTrackingActionAsync = async (payload) => {
  if (!ENABLE_BACKGROUND_LOCATION_TRACKING) {
    return { skipped: true };
  }

  const coords = Number.isFinite(Number(payload?.lat)) && Number.isFinite(Number(payload?.lon))
    ? {
        latitude: Number(payload.lat),
        longitude: Number(payload.lon),
        accuracy: Number.isFinite(Number(payload?.accuracy)) ? Number(payload.accuracy) : undefined,
      }
    : null;

  if (payload?.tipo === 'INGRESO') {
    const result = await startTrackingSession({
      usuarioAct: payload?.usuarioAct,
      codEmp: payload?.codEmp,
      fechaAsistencia: payload?.fechaAsistencia,
      coords,
    });
    return { trackingResult: result };
  }

  if (payload?.tipo === 'SALIDA') {
    const result = await stopTrackingSession({
      usuarioAct: payload?.usuarioAct,
      codEmp: payload?.codEmp,
      coords,
    });
    return { trackingResult: result };
  }

  return { skipped: true };
};

export const enqueueAsistenciaPending = async (payload = {}) => {
  const db = await ensureSchemaAsync();
  const normalizedPayload = normalizePayload(payload);

  if (!normalizedPayload.tipo || !normalizedPayload.usuarioAct || !normalizedPayload.codEmp || !normalizedPayload.fechaAsistencia) {
    throw new Error('No se pudo guardar la asistencia local: faltan campos obligatorios.');
  }

  const localId = payload?.idLocal || createLocalId();
  const queueRecord = {
    IdLocal: localId,
    Modulo: 'ASISTENCIA',
    Operacion: String(normalizedPayload.tipo),
    Payload: JSON.stringify(normalizedPayload),
    FechaRegistro: normalizedPayload.fechaRegistroLocal || getLimaDateTime(),
    Intentos: 0,
    Sincronizado: 0,
    FechaSincronizacion: null,
  };

  await insertPendingRecordAsync(db, queueRecord);
  return {
    localId,
    queued: true,
    payload: normalizedPayload,
  };
};

export const syncPendingAsistenciaQueue = async () => {
  const db = await ensureSchemaAsync();
  const pendingRows = await getPendingRecordsAsync(db);

  if (!Array.isArray(pendingRows) || pendingRows.length === 0) {
    return {
      success: true,
      queued: 0,
      synced: 0,
      pending: 0,
      failed: 0,
      details: [],
    };
  }

  const details = [];
  let synced = 0;
  let failed = 0;

  for (const row of pendingRows) {
    let payload = null;
    try {
      payload = typeof row.Payload === 'string' ? JSON.parse(row.Payload) : row.Payload;
    } catch (error) {
      details.push({
        idLocal: row.IdLocal,
        status: 'invalid-payload',
        message: error?.message || String(error),
        backendResponse: null,
      });
      await markAsFailedAsync(db, row.IdLocal);
      failed += 1;
      continue;
    }

    try {
      const response = await registerAsistencia(payload);
      const isSuccess = !!response && !response.error && response.success === true;
      if (!isSuccess) {
        const message = response?.message || 'No se pudo sincronizar la asistencia';
        await markAsFailedAsync(db, row.IdLocal);
        details.push({
          idLocal: row.IdLocal,
          status: 'failed',
          message,
          backendResponse: response ?? null,
        });
        failed += 1;
        continue;
      }

      await markAsSyncedAsync(db, row.IdLocal);
      let trackingResult = null;
      try {
        const trackingOutcome = await trySyncTrackingActionAsync(payload);
        trackingResult = trackingOutcome?.trackingResult ?? null;
      } catch (trackingError) {
        trackingResult = {
          error: trackingError?.message || String(trackingError),
        };
      }

      details.push({
        idLocal: row.IdLocal,
        status: 'synced',
        backendResponse: response,
        trackingResult,
      });
      synced += 1;
    } catch (error) {
      await markAsFailedAsync(db, row.IdLocal);
      details.push({
        idLocal: row.IdLocal,
        status: 'error',
        message: error?.message || String(error),
        backendResponse: null,
      });
      failed += 1;
    }
  }

  return {
    success: true,
    queued: pendingRows.length,
    synced,
    pending: Math.max(pendingRows.length - synced, 0),
    failed,
    details,
  };
};

export const registerAsistenciaQueued = async (payload = {}) => {
  const queued = await enqueueAsistenciaPending(payload);
  const syncResult = await syncPendingAsistenciaQueue();
  const db = await ensureSchemaAsync();
  const localRecord = await getRecordByIdAsync(db, queued.localId);
  const isSynced = Number(localRecord?.Sincronizado ?? 0) === 1;
  const localDetail = Array.isArray(syncResult?.details)
    ? syncResult.details.find((detail) => detail?.idLocal === queued.localId)
    : null;

  return {
    success: true,
    queued: true,
    synced: isSynced,
    localId: queued.localId,
    payload: queued.payload,
    syncResult,
    serverResponse: localDetail?.backendResponse ?? null,
    message: isSynced
      ? 'Asistencia guardada y sincronizada correctamente.'
      : 'Asistencia guardada localmente. Queda pendiente de sincronización.',
  };
};

export const getPendingAsistenciaCount = async () => {
  const db = await ensureSchemaAsync();
  const row = await db.getFirstAsync(
    `SELECT COUNT(1) AS Total
     FROM ${QUEUE_TABLE}
     WHERE Sincronizado = 0`
  );
  return Number(row?.Total ?? 0);
};

export const getPendingAsistenciaRecords = async () => {
  const db = await ensureSchemaAsync();
  return db.getAllAsync(
    `SELECT IdLocal, Modulo, Operacion, FechaRegistro, Intentos, Sincronizado, FechaSincronizacion, Payload
     FROM ${QUEUE_TABLE}
     ORDER BY FechaRegistro DESC, IdLocal DESC`
  );
};

export const isNativeAsistenciaQueueSupported = Platform.OS === 'android' || Platform.OS === 'ios';
