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

const isEnabled = ENABLE_BACKGROUND_LOCATION_TRACKING && isBackgroundTrackingSupportedPlatform;

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

const normalizePoint = (location, session) => {
  const coords = location?.coords || {};
  const accuracy = Number(coords.accuracy);
  if (!Number.isFinite(Number(coords.latitude)) || !Number.isFinite(Number(coords.longitude))) {
    return null;
  }
  if (Number.isFinite(accuracy) && accuracy > TRACKING_MAX_ACCURACY_METERS) {
    return null;
  }
  return {
    sessionId: session?.sessionId || null,
    codEmp: session?.codEmp || null,
    usuarioAct: session?.usuarioAct || null,
    fechaHora: location?.timestamp ? new Date(location.timestamp).toISOString() : new Date().toISOString(),
    latitud: Number(coords.latitude),
    longitud: Number(coords.longitude),
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: Number.isFinite(Number(coords.speed)) ? Number(coords.speed) : null,
    heading: Number.isFinite(Number(coords.heading)) ? Number(coords.heading) : null,
    source: 'background-task',
  };
};

const flushQueuedPoints = async () => {
  if (!isEnabled) {
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
    await writeQueue([]);
    return { sent: queue.length };
  } catch (error) {
    console.warn('[tracking][flushQueuedPoints]', error?.message);
    return { sent: 0, error: error?.message || String(error) };
  }
};

if (isEnabled && !TaskManager.isTaskDefined(TRACKING_TASK_NAME)) {
  TaskManager.defineTask(TRACKING_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[tracking][task][error]', error.message);
      return;
    }

    const session = await readSession();
    if (!session?.sessionId) {
      return;
    }

    const locations = Array.isArray(data?.locations) ? data.locations : [];
    if (locations.length === 0) {
      return;
    }

    const queue = await readQueue();
    const points = locations
      .map((location) => normalizePoint(location, session))
      .filter(Boolean);

    if (points.length === 0) {
      return;
    }

    const nextQueue = [...queue, ...points];
    await writeQueue(nextQueue);

    // Intentamos enviar en cada ciclo de ubicacion para reflejar el seguimiento
    // casi en tiempo real; si falla, la cola local conserva los puntos.
    await flushQueuedPoints();
  });
}

export const syncQueuedTrackingPoints = async () => {
  return flushQueuedPoints();
};

export const startTrackingSession = async ({
  usuarioAct,
  codEmp,
  fechaAsistencia,
  coords,
}) => {
  if (!isEnabled) {
    return { started: false, skipped: true, reason: 'tracking_disabled' };
  }

  if (ENABLE_BACKGROUND_LOCATION_UPDATES) {
    const foregroundPermission = await Location.requestForegroundPermissionsAsync();
    if (foregroundPermission.status !== 'granted') {
      return { started: false, reason: 'foreground_permission_denied' };
    }

    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
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

  const session = {
    sessionId: sessionResponse?.sessionId,
    codEmp,
    usuarioAct,
    fechaAsistencia,
    plataforma: Platform.OS,
    startedAt: new Date().toISOString(),
  };

  await writeSession(session);
  await writeQueue([]);

  if (!ENABLE_BACKGROUND_LOCATION_UPDATES) {
    return {
      started: true,
      sessionId: session.sessionId,
      backgroundUpdates: false,
    };
  }

  const options = {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: TRACKING_DISTANCE_INTERVAL_METERS,
    deferredUpdatesDistance: TRACKING_DEFERRED_DISTANCE_METERS,
    deferredUpdatesInterval: TRACKING_DEFERRED_INTERVAL_MS,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  };

  if (Platform.OS === 'android') {
    options.timeInterval = TRACKING_TIME_INTERVAL_MS;
    options.foregroundService = {
      notificationTitle: TRACKING_NOTIFICATION.title,
      notificationBody: TRACKING_NOTIFICATION.body,
      killServiceOnDestroy: false,
    };
  }

  await Location.startLocationUpdatesAsync(TRACKING_TASK_NAME, options);
  return { started: true, sessionId: session.sessionId };
};

export const stopTrackingSession = async ({
  usuarioAct,
  codEmp,
  coords,
}) => {
  if (!isEnabled) {
    return { stopped: false, skipped: true, reason: 'tracking_disabled' };
  }

  const session = await readSession();
  let flushResult = { sent: 0, skipped: true };

  if (ENABLE_BACKGROUND_LOCATION_UPDATES) {
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

  await deleteFileIfExists(SESSION_FILE);
  await writeQueue([]);
  return { stopped: true, flushResult };
};
