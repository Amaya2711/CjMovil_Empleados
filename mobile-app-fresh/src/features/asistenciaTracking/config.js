import { Platform } from 'react-native';

export const ASISTENCIA_TRACKING_ROLLBACK_MARKER = 'ROLLBACK_ASISTENCIA_BG_TRACKING_V1';

// Modo activo: se habilita la sesion y el seguimiento continuo entre INGRESO y SALIDA.
export const ENABLE_BACKGROUND_LOCATION_TRACKING = true;
export const ENABLE_BACKGROUND_LOCATION_UPDATES = true;

export const TRACKING_TASK_NAME = 'asistencia-background-location-task';
// Captura pensada para trazar ruta con más detalle y menos saltos.
export const TRACKING_TIME_INTERVAL_MS = 60 * 1000;
export const TRACKING_DISTANCE_INTERVAL_METERS = 5;
export const TRACKING_DEFERRED_INTERVAL_MS = 0;
export const TRACKING_DEFERRED_DISTANCE_METERS = 0;
export const TRACKING_BATCH_SIZE = 10;
export const TRACKING_MAX_ACCURACY_METERS = 250;
export const TRACKING_MIN_DISTANCE_BETWEEN_POINTS_METERS = 2;

export const TRACKING_NOTIFICATION = {
  title: 'Seguimiento de asistencia activo',
  body: 'Se sigue registrando la ubicacion hasta marcar SALIDA.',
};

export const isBackgroundTrackingSupportedPlatform =
  Platform.OS === 'android' || Platform.OS === 'ios';
