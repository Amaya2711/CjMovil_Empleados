import { getSolicitantesService } from '../services/solicitanteService.js';

export const getSolicitantes = async (req, res) => {
  try {
    const solicitantes = await getSolicitantesService();
    res.json(solicitantes);
  } catch (error) {
    console.error('Error al consultar solicitantes:', error);
    res.status(500).json({ message: 'Error al consultar solicitantes', error: error.message });
  }
};
