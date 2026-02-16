import { BASE_URL } from '../config';

const API_BASE = '/api/asistencia';

const LISTADO_DIARIO_PATH = '/listado-diario';

export const getAsistencia = async ({ codEmp, fechaAsistencia } = {}) => {
  try {
    let url = `${BASE_URL}${API_BASE}`;
    const params = new URLSearchParams();
    if (codEmp) params.append('codEmp', codEmp);
    if (fechaAsistencia) params.append('fechaAsistencia', fechaAsistencia);
    const query = params.toString();
    if (query) url += `?${query}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener asistencia');
    return await res.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};

export const registerAsistencia = async ({ usuarioAct, codEmp, tipo, lat, lon, fechaAsistencia, outOfRange } = {}) => {
  try {
    const url = `${BASE_URL}${API_BASE}/register`;
    const body = { usuarioAct, codEmp, tipo, fechaAsistencia };
    if (typeof lat !== 'undefined' && typeof lon !== 'undefined') {
      body.lat = lat;
      body.lon = lon;
    }
    if (typeof outOfRange !== 'undefined') {
      body.outOfRange = !!outOfRange;
    }
    console.log('[registerAsistencia][REQUEST]', { url, body });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    console.log('[registerAsistencia][RESPONSE]', { status: res.status, ok: res.ok, payload });
    if (!res.ok) {
      throw new Error(payload?.message || 'Error al registrar asistencia');
    }
    return payload;
  } catch (error) {
    console.error('[registerAsistencia][ERROR]', error?.message || error);
    return { error: true, message: error.message };
  }
};

export const validarListadoDiario = async ({ usuarioCre } = {}) => {
  try {
    const url = `${BASE_URL}${API_BASE}${LISTADO_DIARIO_PATH}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioCre }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || 'Error al validar listado diario');
    }
    return payload;
  } catch (error) {
    return { error: true, message: error.message };
  }
};

export const getConstanteOficinas = async () => {
  try {
    const url = `${BASE_URL}${API_BASE}/constante-oficinas`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener constante de oficinas');
    return await res.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};

export const eliminarAsistenciaPrueba = async () => {
  try {
    const url = `${BASE_URL}${API_BASE}/eliminar-prueba`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Error al ejecutar eliminación de prueba');
    return await res.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};
