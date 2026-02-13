
import { BASE_URL } from '../config';

const API_PATH = '/api/Reaprobaciones';
// Recibe un objeto con los mismos parámetros que espera el backend
export const getReaprobaciones = async (params = {}) => {
  try {
    const url = `${BASE_URL}${API_PATH}`;
    console.log('Conectando a:', url, 'con params:', params);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Error al consultar reaprobaciones');
    return await response.json();
  } catch (error) {
    return [];
  }
};

// Aprobar planilla desde ReAprobarPagosScreen
export const aprobarPlanilla = async (params = {}) => {
  try {
    const url = `${BASE_URL}${API_PATH}/aprobar`;
    console.log('Conectando a:', url, 'con params:', params);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: true, message: error.message };
  }
};
