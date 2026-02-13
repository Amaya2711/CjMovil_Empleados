import { BASE_URL } from '../config';

const API_PATH = '/api/reportes/planilla-dinamico';

export const getReportePlanillaDinamico = async (params = {}) => {
  try {
    const url = `${BASE_URL}${API_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Error al consultar el reporte');
    return await response.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};
