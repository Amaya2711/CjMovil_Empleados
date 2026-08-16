import { registerAsistencia } from '../api/asistencia';

export const enqueueAsistenciaPending = async (payload = {}) => {
  return {
    localId: payload?.idLocal ?? null,
    queued: false,
    payload,
    skipped: true,
  };
};

export const syncPendingAsistenciaQueue = async () => {
  return {
    success: true,
    queued: 0,
    synced: 0,
    pending: 0,
    failed: 0,
    details: [],
    skipped: true,
  };
};

export const registerAsistenciaQueued = async (payload = {}) => {
  const response = await registerAsistencia(payload);
  if (response && !response.error && response.success === true) {
    return {
      success: true,
      queued: false,
      synced: true,
      localId: null,
      payload,
      syncResult: { success: true, synced: 1, pending: 0, failed: 0, details: [] },
      message: 'Asistencia registrada correctamente.',
    };
  }

  return {
    success: false,
    queued: false,
    synced: false,
    localId: null,
    payload,
    syncResult: { success: false, synced: 0, pending: 0, failed: 1, details: [] },
    error: true,
    message: response?.message || 'No se pudo registrar la asistencia.',
  };
};

export const getPendingAsistenciaCount = async () => 0;

export const getPendingAsistenciaRecords = async () => [];

export const isNativeAsistenciaQueueSupported = false;
