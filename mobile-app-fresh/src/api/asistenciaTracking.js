import { BASE_URL } from '../config';

const API_BASE = '/api/asistencia/tracking';

const postJson = async (path, body) => {
  const url = `${BASE_URL}${API_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = payload?.message || payload?.error || `Error HTTP ${res.status}`;
    throw new Error(detail);
  }
  return payload;
};

export const startTrackingSessionRequest = async (body = {}) => {
  return postJson('/session/start', body);
};

export const stopTrackingSessionRequest = async (body = {}) => {
  return postJson('/session/stop', body);
};

export const sendTrackingPointsBatchRequest = async (body = {}) => {
  return postJson('/points/batch', body);
};
