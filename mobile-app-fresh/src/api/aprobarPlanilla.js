
import axios from 'axios';
import { BASE_URL } from '../config';

// Ejecuta el store sp_Movil_AprobarPlanilla para un registro
export async function aprobarPlanilla({ ipLocal, CorFil, cIdSite, IdEst, IdResponsable, txtOb, cIdRegularizar }) {
  // Log para depuración
  console.log('Llamando API aprobarPlanilla con:', { ipLocal, CorFil, cIdSite, IdEst, IdResponsable, txtOb, cIdRegularizar });
  const url = `${BASE_URL}/api/aprobarPlanilla`;
  console.log('Conectando a:', url);
  return axios.post(url, {
    ipLocal,
    CorFil,
    cIdSite,
    IdEst,
    IdResponsable,
    txtOb,
    cIdRegularizar
  });
}
