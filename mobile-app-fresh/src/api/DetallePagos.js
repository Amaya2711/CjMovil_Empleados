import { BASE_URL } from '../config';

const API_PATH = '/api/reportes/detalle-pagos';

export const getDetallePagos = async ({ proyecto, anos, page, pageSize }) => {
  try {
    const url = `${BASE_URL}${API_PATH}`;
    const body = {};
    if (proyecto) body.pProyecto = proyecto;
    if (anos && Array.isArray(anos) && anos.length > 0) {
      body.Ano = anos.map(Number).join(',');
    } else if (anos) {
      body.Ano = String(anos);
    }
    if (page) body.page = page;
    if (pageSize) body.pageSize = pageSize;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Error al consultar el detalle de pagos');
    return await response.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};
