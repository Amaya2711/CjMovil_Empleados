import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  sendTrackingPointsBatchRequest,
  startTrackingSessionRequest,
  stopTrackingSessionRequest,
} from '../../api/asistenciaTracking';
import {
  ENABLE_BACKGROUND_LOCATION_TRACKING,
  ENABLE_BACKGROUND_LOCATION_UPDATES,
  TRACKING_BATCH_SIZE,
  TRACKING_DEFERRED_DISTANCE_METERS,
  TRACKING_DEFERRED_INTERVAL_MS,
  TRACKING_DISTANCE_INTERVAL_METERS,
  TRACKING_MAX_ACCURACY_METERS,
  TRACKING_NOTIFICATION,
  TRACKING_TASK_NAME,
  TRACKING_TIME_INTERVAL_MS,
  isBackgroundTrackingSupportedPlatform,
} from './config';

const TRACKING_DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}asistencia-tracking/`
  : null;
const SESSION_FILE = TRACKING_DIRECTORY ? `${TRACKING_DIRECTORY}session.json` : null;
const QUEUE_FILE = TRACKING_DIRECTORY ? `${TRACKING_DIRECTORY}queue.json` : null;
const DEBUG_FILE = TRACKING_DIRECTORY ? `${TRACKING_DIRECTORY}debug.json` : null;
const TRACKING_DEBUG_MAX_ENTRIES = 100;

const isNativeBackgroundTrackingSupported = ENABLE_BACKGROUND_LOCATION_TRACKING && isBackgroundTrackingSupportedPlatform;
const isTrackingSessionSupported = ENABLE_BACKGROUND_LOCATION_TRACKING;
let webTrackingSession = null;

const ensureTrackingDirectory = async () => {
  if (!TRACKING_DIRECTORY) return false;
  const info = await FileSystem.getInfoAsync(TRACKING_DIRECTORY);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TRACKING_DIRECTORY, { intermediates: true });
  }
  return true;
};

const readJsonFile = async (fileUri, fallbackValue) => {
  if (!fileUri) return fallbackValue;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) return fallbackValue;
    const content = await FileSystem.readAsStringAsync(fileUri);
    return content ? JSON.parse(content) : fallbackValue;
  } catch (error) {
    console.warn('[tracking][readJsonFile]', fileUri, error?.message);
    return fallbackValue;
  }
};

const writeJsonFile = async (fileUri, value) => {
  if (!fileUri) return;
  await ensureTrackingDirectory();
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(value));
};

const deleteFileIfExists = async (fileUri) => {
  if (!fileUri) return;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    console.warn('[tracking][deleteFileIfExists]', fileUri, error?.message);
  }
};

const readSession = async () => readJsonFile(SESSION_FILE, null);
const writeSession = async (session) => writeJsonFile(SESSION_FILE, session);
const readQueue = async () => readJsonFile(QUEUE_FILE, []);
const writeQueue = async (queue) => writeJsonFile(QUEUE_FILE, queue);
const readDebugLog = async () => readJsonFile(DEBUG_FILE, []);
const writeDebugLog = async (entries) => writeJsonFile(DEBUG_FILE, entries);

const appendDebugEvent = async (event) => {
  if (!DEBUG_FILE) return;
  const current = await readDebugLog();
  const next = [
    ...(Array.isArray(current) ? current : []),
    {
      timestamp: new Date().toISOString(),
      ...event,
    },
  ].slice(-TRACKING_DEBUG_MAX_ENTRIES);
  await writeDebugLog(next);
};

const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const earthRadius = 6371000;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRadians(Number(lat2) - Number(lat1));
  const dLon = toRadians(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(Number(lat1))) *
      Math.cos(toRadians(Number(lat2))) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getPointSummary = (point) => ({
  fechaHora: point?.fechaHora ?? null,
  capturedAtMs: Number.isFinite(Number(point?.capturedAtMs)) ? Number(point.capturedAtMs) : null,
  latitud: point?.latitud ?? null,
  longitud: point?.longitud ?? null,
  accuracy: point?.accuracy ?? null,
  source: point?.source ?? null,
});

const formatLimaDateTime = (timestamp = Date.now()) => {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

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

  if (!values.year || !values.month || !values.day || !values.hour || !values.minute || !values.second) {
    return null;
  }

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
};

const isPointNearLastPoint = (currentPoint, lastPoint) => {
  if (!currentPoint || !lastPoint) return false;

  const currentCapturedAt = Number(currentPoint.capturedAtMs);
  const lastCapturedAt = Number(lastPoint.capturedAtMs);

  const distance = calculateDistanceMeters(
    currentPoint.latitud,
    currentPoint.longitud,
    lastPoint.latitud,
    lastPoint.longitud
  );
  const isTooClose = Number.isFinite(distance) && distance <= 5;

  if (isTooClose) {
    return true;
  }

  if (Number.isFinite(currentCapturedAt) && Number.isFinite(lastCapturedAt)) {
    const elapsedMs = currentCapturedAt - lastCapturedAt;
    if (elapsedMs < TRACKING_TIME_INTERVAL_MS) {
      // Si el punto ya cambió de ubicación, no lo descartamos solo por tiempo.
      // La regla de 5 minutos sigue ayudando a evitar ruido cuando el punto es casi igual.
      return false;
    }
  }

  return false;
};

const normalizePoint = (location, session) => {
  const coords = location?.coords || {};
  const accuracy = Number(coords.accuracy);
  if (!Number.isFinite(Number(coords.latitude)) || !Number.isFinite(Number(coords.longitude))) {
    console.warn('[tracking][normalizePoint] Coordenadas inválidas:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return null;
  }
  if (Number.isFinite(accuracy) && accuracy > TRACKING_MAX_ACCURACY_METERS) {
    console.warn('[tracking][normalizePoint] Punto descartado por precisión:', {
      accuracy,
      maxAllowed: TRACKING_MAX_ACCURACY_METERS,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return null;
  }
  return {
    sessionId: session?.sessionId || null,
    codEmp: session?.codEmp || null,
    usuarioAct: session?.usuarioAct || null,
    fechaHora: formatLimaDateTime(location?.timestamp) || formatLimaDateTime(),
    capturedAtMs: Number.isFinite(Number(location?.timestamp)) ? Number(location.timestamp) : Date.now(),
    latitud: Number(coords.latitude),
    longitud: Number(coords.longitude),
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: Number.isFinite(Number(coords.speed)) ? Number(coords.speed) : null,
    heading: Number.isFinite(Number(coords.heading)) ? Number(coords.heading) : null,
    source: 'background-task',
  };
};

const flushQueuedPoints = async () => {
  if (!isNativeBackgroundTrackingSupported) {
    return { sent: 0, skipped: true };
  }

  const session = await readSession();
  const queue = await readQueue();
  if (!session?.sessionId || !Array.isArray(queue) || queue.length === 0) {
    return { sent: 0, skipped: true };
  }

  try {
    await sendTrackingPointsBatchRequest({
      sessionId: session.sessionId,
      codEmp: session.codEmp,
      usuarioAct: session.usuarioAct,
      points: queue,
    });
    await appendDebugEvent({
      type: 'flush_success',
      sessionId: session.sessionId,
      pointsCount: queue.length,
      lastPoint: getPointSummary(queue[queue.length - 1] || null),
    });
    const lastPoint = queue[queue.length - 1] || null;
    await writeSession({
      ...session,
      lastPoint: lastPoint ? getPointSummary(lastPoint) : session.lastPoint || null,
      lastSyncAt: new Date().toISOString(),
    });
    await writeQueue([]);
    return { sent: queue.length };
  } catch (error) {
    console.warn('[tracking][flushQueuedPoints]', error?.message);
    await appendDebugEvent({
      type: 'flush_error',
      sessionId: session.sessionId,
      error: error?.message || String(error),
      pointsCount: queue.length,
    });
    return { sent: 0, error: error?.message || String(error) };
  }
};

if (isNativeBackgroundTrackingSupported && !TaskManager.isTaskDefined(TRACKING_TASK_NAME)) {
  console.log('[tracking][task][define]', {
    taskName: TRACKING_TASK_NAME,
    platform: Platform.OS,
  });
  TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[tracking][task][error]', error.message);
      return;
    }

    const session = await readSession();
    if (!session?.sessionId) {
      console.warn('[tracking][task][skip] No existe session activa');
      return;
    }

    const locations = Array.isArray(data?.locations) ? data.locations : [];
    if (locations.length === 0) {
      console.warn('[tracking][task][skip] No llegaron ubicaciones');
      return;
    }

    console.log('[tracking][task][received]', {
      sessionId: session.sessionId,
      locationsCount: locations.length,
      platform: Platform.OS,
    });

    const queue = await readQueue();
    const lastQueuedPoint = queue.length > 0 ? queue[queue.length - 1] : session?.lastPoint || null;
    const points = locations
      .map((location) => normalizePoint(location, session))
      .filter(Boolean);

    if (points.length === 0) {
      console.warn('[tracking][task][skip] No quedaron puntos válidos luego de normalizar');
      return;
    }

    const filteredPoints = [];
    let referencePoint = lastQueuedPoint;

    for (const point of points) {
      if (isPointNearLastPoint(point, referencePoint)) {
        console.log('[tracking][task][dedupe] Punto omitido por ser muy parecido al anterior', {
          current: getPointSummary(point),
          previous: getPointSummary(referencePoint),
        });
        continue;
      }

      filteredPoints.push(point);
      referencePoint = point;
    }

    if (filteredPoints.length === 0) {
      console.warn('[tracking][task][skip] Todos los puntos recibidos eran duplicados o demasiado cercanos al último');
      return;
    }

    const nextQueue = [...queue, ...filteredPoints];
    console.log('[tracking][task][queue]', {
      previousQueueCount: queue.length,
      newPointsCount: filteredPoints.length,
      nextQueueCount: nextQueue.length,
    });
    await appendDebugEvent({
      type: 'batch_received',
      sessionId: session.sessionId,
      receivedCount: locations.length,
      validCount: points.length,
      queuedCount: filteredPoints.length,
      points: filteredPoints.map((point) => getPointSummary(point)),
    });
    await writeQueue(nextQueue);
    await writeSession({
      ...session,
      lastPoint: getPointSummary(filteredPoints[filteredPoints.length - 1]),
      lastSyncAt: new Date().toISOString(),
    });

    // Intentamos enviar en cada ciclo de ubicacion para reflejar el seguimiento
    // casi en tiempo real; si falla, la cola local conserva los puntos.
    await flushQueuedPoints();
  });
}

export const syncQueuedTrackingPoints = async () => {
  return flushQueuedPoints();
};

export const getTrackingDebugEntries = async () => {
  const entries = await readDebugLog();
  return Array.isArray(entries) ? entries : [];
};

export const startTrackingSession = async ({
  usuarioAct,
  codEmp,
  fechaAsistencia,
  coords,
}) => {
  if (!isTrackingSessionSupported) {
    return { started: false, skipped: true, reason: 'tracking_disabled' };
  }

  console.log('[tracking][start]', {
    usuarioAct,
    codEmp,
    fechaAsistencia,
    platform: Platform.OS,
    hasCoords: !!coords,
  });

  if (ENABLE_BACKGROUND_LOCATION_UPDATES && isNativeBackgroundTrackingSupported) {
    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    console.log('[tracking][permissions][foreground]', foregroundPermission);
    if (foregroundPermission.status !== 'granted') {
      return { started: false, reason: 'foreground_permission_denied' };
    }

    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    console.log('[tracking][permissions][background]', backgroundPermission);
    if (backgroundPermission.status !== 'granted') {
      return { started: false, reason: 'background_permission_denied' };
    }

    await flushQueuedPoints();

    const isAlreadyRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
    if (isAlreadyRunning) {
      await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
    }
  }

  const sessionResponse = await startTrackingSessionRequest({
    usuarioAct,
    codEmp,
    fechaAsistencia,
    plataforma: Platform.OS,
    latitudIngreso: coords?.latitude,
    longitudIngreso: coords?.longitude,
    accuracyIngreso: coords?.accuracy,
  });

  if (!sessionResponse?.sessionId) {
    throw new Error('No se pudo crear la sesion de tracking');
  }

  const session = {
    sessionId: sessionResponse?.sessionId,
    codEmp,
    usuarioAct,
    fechaAsistencia,
    plataforma: Platform.OS,
    startedAt: new Date().toISOString(),
    lastPoint: coords ? getPointSummary({
      fechaHora: formatLimaDateTime(),
      capturedAtMs: Date.now(),
      latitud: coords?.latitude,
      longitud: coords?.longitude,
      accuracy: coords?.accuracy,
      source: 'ingreso',
    }) : null,
  };

  if (isNativeBackgroundTrackingSupported) {
    await writeSession(session);
    await writeQueue([]);
  }

  if (session.sessionId && coords?.latitude !== undefined && coords?.longitude !== undefined) {
    try {
      const initialPoint = {
        sessionId: session.sessionId,
        codEmp: session.codEmp,
        usuarioAct: session.usuarioAct,
        fechaHora: formatLimaDateTime(),
        capturedAtMs: Date.now(),
        latitud: Number(coords.latitude),
        longitud: Number(coords.longitude),
        accuracy: Number.isFinite(Number(coords?.accuracy)) ? Number(coords.accuracy) : null,
        speed: Number.isFinite(Number(coords?.speed)) ? Number(coords.speed) : null,
        heading: Number.isFinite(Number(coords?.heading)) ? Number(coords.heading) : null,
        source: 'ingreso',
      };

      await sendTrackingPointsBatchRequest({
        sessionId: session.sessionId,
        codEmp: session.codEmp,
        usuarioAct: session.usuarioAct,
        points: [initialPoint],
      });

      if (isNativeBackgroundTrackingSupported) {
        await writeSession({
          ...session,
          lastPoint: getPointSummary(initialPoint),
          lastSyncAt: new Date().toISOString(),
        });
      }

      await appendDebugEvent({
        type: 'initial_point_sent',
        sessionId: session.sessionId,
        point: getPointSummary(initialPoint),
      });
      console.log('[tracking][initial_point_sent]', {
        sessionId: session.sessionId,
        point: getPointSummary(initialPoint),
      });
    } catch (error) {
      console.warn('[tracking][initial_point_sent][WARN]', error?.message || error);
      await appendDebugEvent({
        type: 'initial_point_error',
        sessionId: session.sessionId,
        error: error?.message || String(error),
      });
    }
  }

  if (Platform.OS === 'web') {
    webTrackingSession = {
      ...session,
      startedAt: new Date().toISOString(),
      lastPoint: coords ? getPointSummary({
        fechaHora: formatLimaDateTime(),
        capturedAtMs: Date.now(),
        latitud: coords?.latitude,
        longitud: coords?.longitude,
        accuracy: coords?.accuracy,
        source: 'ingreso',
      }) : null,
    };
  }

  if (!ENABLE_BACKGROUND_LOCATION_UPDATES || !isNativeBackgroundTrackingSupported) {
    return {
      started: true,
      sessionId: session.sessionId,
      backgroundUpdates: false,
      webFallback: Platform.OS === 'web',
    };
  }

  const trackingAccuracy = Location.Accuracy.Highest ?? Location.Accuracy.High;
  const options = {
    accuracy: trackingAccuracy,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  };

  if (TRACKING_DISTANCE_INTERVAL_METERS > 0) {
    options.distanceInterval = TRACKING_DISTANCE_INTERVAL_METERS;
  } else {
    options.distanceInterval = 0;
  }

  if (TRACKING_DEFERRED_DISTANCE_METERS > 0) {
    options.deferredUpdatesDistance = TRACKING_DEFERRED_DISTANCE_METERS;
  }

  if (TRACKING_DEFERRED_INTERVAL_MS > 0) {
    options.deferredUpdatesInterval = TRACKING_DEFERRED_INTERVAL_MS;
  }

  if (Platform.OS === 'android') {
    options.timeInterval = TRACKING_TIME_INTERVAL_MS;
    options.foregroundService = {
      notificationTitle: TRACKING_NOTIFICATION.title,
      notificationBody: TRACKING_NOTIFICATION.body,
      killServiceOnDestroy: false,
    };
  }

  console.log('[tracking][startLocationUpdatesAsync]', {
    taskName: TRACKING_TASK_NAME,
    options,
  });
  await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, options);
  console.log('[tracking][started]', {
    sessionId: session.sessionId,
    backgroundUpdates: ENABLE_BACKGROUND_LOCATION_UPDATES,
  });
  return { started: true, sessionId: session.sessionId };
};

export const stopTrackingSession = async ({
  usuarioAct,
  codEmp,
  coords,
}) => {
  if (!isTrackingSessionSupported) {
    return { stopped: false, skipped: true, reason: 'tracking_disabled' };
  }

  const session = isNativeBackgroundTrackingSupported ? await readSession() : webTrackingSession;
  let flushResult = { sent: 0, skipped: true };

  if (ENABLE_BACKGROUND_LOCATION_UPDATES && isNativeBackgroundTrackingSupported) {
    flushResult = await flushQueuedPoints();
    const isRunning = await Location.hasStartedLocationUpdatesAsync(TRACKING_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(TRACKING_TASK_NAME);
    }
  }

  if (session?.sessionId) {
    try {
      await stopTrackingSessionRequest({
        sessionId: session.sessionId,
        usuarioAct: usuarioAct ?? session.usuarioAct,
        codEmp: codEmp ?? session.codEmp,
        latitudSalida: coords?.latitude,
        longitudSalida: coords?.longitude,
        accuracySalida: coords?.accuracy,
      });
    } catch (error) {
      console.warn('[tracking][stopTrackingSession]', error?.message);
      return { stopped: false, error: error?.message || String(error), flushResult };
    }
  }

  if (isNativeBackgroundTrackingSupported) {
    await deleteFileIfExists(SESSION_FILE);
    await writeQueue([]);
  }
  if (Platform.OS === 'web') {
    webTrackingSession = null;
  }
  return { stopped: true, flushResult };
};

export const sendWebTrackingPoint = async (coords) => {
  if (Platform.OS !== 'web') {
    return { sent: 0, skipped: true, reason: 'not_web' };
  }

  if (!webTrackingSession?.sessionId) {
    return { sent: 0, skipped: true, reason: 'no_web_session' };
  }

  const point = normalizePoint(
    {
      coords: {
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        accuracy: coords?.accuracy,
        speed: coords?.speed,
        heading: coords?.heading,
      },
      timestamp: Date.now(),
    },
    webTrackingSession
  );

  if (!point) {
    return { sent: 0, skipped: true, reason: 'invalid_point' };
  }

  if (isPointNearLastPoint(point, webTrackingSession.lastPoint)) {
    return { sent: 0, skipped: true, reason: 'duplicate_point' };
  }

  try {
    await sendTrackingPointsBatchRequest({
      sessionId: webTrackingSession.sessionId,
      codEmp: webTrackingSession.codEmp,
      usuarioAct: webTrackingSession.usuarioAct,
      points: [point],
    });
    webTrackingSession = {
      ...webTrackingSession,
      lastPoint: getPointSummary(point),
      lastSyncAt: new Date().toISOString(),
    };
    return { sent: 1 };
  } catch (error) {
    console.warn('[tracking][web][sendWebTrackingPoint]', error?.message);
    return { sent: 0, error: error?.message || String(error) };
  }
};
