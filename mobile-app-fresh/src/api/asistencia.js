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
    console.log('[getAsistencia][REQUEST]', { url, codEmp, fechaAsistencia });
    const res = await fetch(url);
    const payload = await res.json().catch(() => null);
    console.log('[getAsistencia][RESPONSE]', { status: res.status, ok: res.ok, payload });
    if (!res.ok) {
      const detail = payload?.message || payload?.error || null;
      throw new Error(detail ? `Error al obtener asistencia (${res.status}): ${detail}` : `Error al obtener asistencia (${res.status})`);
    }
    return payload;
  } catch (error) {
    return { error: true, message: error.message };
  }
};

export const registerAsistencia = async ({ usuarioAct, codEmp, tipo, lat, lon, fechaAsistencia, comentario, estadoMarcacion, estadoSalida, imagenBase64, nombreImagen } = {}) => {
  try {
    const url = `${BASE_URL}${API_BASE}/register`;
    const body = { usuarioAct, codEmp, tipo, fechaAsistencia };
    if (typeof comentario !== 'undefined') {
      body.comentario = String(comentario || '').slice(0, 250);
    }
    if (typeof lat !== 'undefined' && typeof lon !== 'undefined') {
      body.lat = lat;
      body.lon = lon;
    }
    if (typeof estadoMarcacion !== 'undefined') {
      body.estadoMarcacion = estadoMarcacion;
    }
    if (typeof estadoSalida !== 'undefined') {
      body.estadoSalida = estadoSalida;
    }
    if (typeof imagenBase64 !== 'undefined') {
      body.imagenBase64 = imagenBase64;
    }
    if (typeof nombreImagen !== 'undefined') {
      body.nombreImagen = nombreImagen;
    }
    console.log('[registerAsistencia][REQUEST]', { url, body: { ...body, imagenBase64: body.imagenBase64 ? '...(base64)...' : undefined } });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    console.log('[registerAsistencia][RESPONSE]', { status: res.status, ok: res.ok, payload });
    if (!res.ok) {
      // Extraer mensaje detallado del servidor
      let errorMessage = null;
      
      // Intentar obtener el mensaje de múltiples fuentes
      if (payload) {
        if (typeof payload === 'string') {
          errorMessage = payload;
        } else if (typeof payload === 'object') {
          errorMessage = payload.message || payload.error || payload.detail || payload.msg || null;
        }
      }
      
      // Si no hay mensaje, usar uno basado en el status HTTP
      if (!errorMessage) {
        if (res.status === 400) errorMessage = 'Datos inválidos. Verifique los campos requeridos';
        else if (res.status === 409) errorMessage = 'Ya existe un registro para esta fecha y hora';
        else if (res.status === 500) errorMessage = 'Error en el servidor. Intente más tarde';
        else errorMessage = `Error HTTP ${res.status}. No se pudo registrar la asistencia`;
      }
      
      console.error('[registerAsistencia][ERROR_DETAIL]', { status: res.status, payload, errorMessage });
      throw new Error(errorMessage);
    }
    return payload;
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error('[registerAsistencia][ERROR]', errorMsg);
    return { error: true, message: errorMsg };
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
