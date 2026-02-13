import { BASE_URL } from '../config';

export const getDatosOc = async ({ idoc, fila, IdSite, Tipo_Trabajo }) => {
  try {
    const url = `${BASE_URL}/api/datos-oc`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idoc, fila, IdSite, Tipo_Trabajo }),
    });
    if (!response.ok) throw new Error('Error al consultar datos OC');
    return await response.json();
  } catch (error) {
    return { error: true, message: error.message };
  }
};
