

import { BASE_URL } from '../config';

const API_PATH = '/api/aprobaciones';
export const getAprobaciones = async (idSolicitante = '', IdValidador = undefined) => {
  try {
    let url = `${BASE_URL}${API_PATH}`;
    const params = [];
    if (idSolicitante) params.push(`IdSolicitante=${encodeURIComponent(idSolicitante)}`);
    if (IdValidador !== undefined && IdValidador !== null && IdValidador !== '') params.push(`IdValidador=${encodeURIComponent(IdValidador)}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    console.log('Conectando a:', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al consultar aprobaciones');
    return await response.json();
  } catch (error) {
    return [];
  }
};
