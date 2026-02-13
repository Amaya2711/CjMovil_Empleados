import { BASE_URL } from '../config';

const API_BASE = '/api/asistencia';

export const getAsistencia = async ({ codEmp } = {}) => {
  try {
    let url = `${BASE_URL}${API_BASE}`;
    if (codEmp) url += `?codEmp=${encodeURIComponent(codEmp)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener asistencia');
    return await res.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};

export const registerAsistencia = async ({ codEmp, tipo, lat, lon } = {}) => {
  try {
    const url = `${BASE_URL}${API_BASE}/register`;
    const body = { codEmp, tipo };
    if (typeof lat !== 'undefined' && typeof lon !== 'undefined') {
      body.lat = lat;
      body.lon = lon;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Error al registrar asistencia');
    return await res.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};
