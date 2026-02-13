import { getAsistenciaService, registerAsistenciaService } from '../services/asistenciaService.js';

export const getAsistencia = async (req, res) => {
  try {
    const codEmp = req.query.codEmp || req.body?.codEmp || '';
    // El parámetro que espera el SP es IdEmpleado
    const idEmpleado = codEmp;
    const rows = await getAsistenciaService(idEmpleado);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ message: 'Error al obtener asistencia', error: error.message });
  }
};

export const registerAsistencia = async (req, res) => {
  try {
    const { codEmp, tipo, lat, lon } = req.body || {};
    const idEmpleado = codEmp || '';
    const result = await registerAsistenciaService({ idEmpleado, tipo, lat, lon });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({ message: 'Error al registrar asistencia', error: error.message });
  }
};
