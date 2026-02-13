

import { BASE_URL } from '../config';

const API_PATH = '/api/solicitantes';
export const getSolicitantes = async (nombre = '') => {
  try {
    // Si nombre está vacío, no enviar query param
    const url = nombre ? `${BASE_URL}${API_PATH}?NombreEmpleado=${encodeURIComponent(nombre)}` : `${BASE_URL}${API_PATH}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al consultar solicitantes');
    return await response.json();
  } catch (error) {
    return [];
  }
};
