import { Platform } from 'react-native';

export const ASISTENCIA_TRACKING_ROLLBACK_MARKER = 'ROLLBACK_ASISTENCIA_BG_TRACKING_V1';

// Para rollback funcional rapido, cambiar a false y recompilar la app.
export const ENABLE_BACKGROUND_LOCATION_TRACKING = true;

export const TRACKING_TASK_NAME = 'asistencia-background-location-task';
export const TRACKING_TIME_INTERVAL_MS = 5 * 60 * 1000;
export const TRACKING_DISTANCE_INTERVAL_METERS = 50;
export const TRACKING_DEFERRED_INTERVAL_MS = 2 * 60 * 1000;
export const TRACKING_DEFERRED_DISTANCE_METERS = 25;
export const TRACKING_BATCH_SIZE = 10;
export const TRACKING_MAX_ACCURACY_METERS = 100;

export const TRACKING_NOTIFICATION = {
  title: 'Seguimiento de asistencia activo',
  body: 'Se sigue registrando la ubicacion hasta marcar SALIDA.',
};

export const isBackgroundTrackingSupportedPlatform =
  Platform.OS === 'android' || Platform.OS === 'ios';
