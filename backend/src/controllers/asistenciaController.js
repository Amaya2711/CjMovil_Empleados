import { cargarListadoDiarioService, constanteOficinasService, eliminarAsistenciaPruebaService, getAsistenciaService, registerAsistenciaService } from '../services/asistenciaService.js';

export const getAsistencia = async (req, res) => {
  try {
    const codEmp = req.query.codEmp || req.body?.codEmp || '';
    const fechaAsistencia = req.query.fechaAsistencia || req.body?.fechaAsistencia || null;
    // El parámetro que espera el SP es IdEmpleado
    const idEmpleado = codEmp;
    const rows = await getAsistenciaService(idEmpleado, fechaAsistencia);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener asistencia:', error);
    res.status(500).json({ message: 'Error al obtener asistencia', error: error.message });
  }
};

export const registerAsistencia = async (req, res) => {
  try {
    const { usuarioAct, codEmp, tipo, lat, lon } = req.body || {};
    console.log('[registerAsistencia][BODY]', { usuarioAct, codEmp, tipo, lat, lon });
    if (String(tipo || '').toUpperCase() === 'SALIDA') {
      console.log('[SALIDA][BODY]', {
        usuarioAct,
        codEmp,
        tipo,
        lat,
        lon,
        sourceIp: req.ip,
      });
    }
    const usuarioActValue =
      usuarioAct === null || typeof usuarioAct === 'undefined'
        ? (codEmp === null || typeof codEmp === 'undefined' ? '' : String(codEmp).trim())
        : String(usuarioAct).trim();

    if (!usuarioActValue) {
      return res.status(400).json({ message: 'Parámetro usuarioAct es requerido' });
    }

    const result = await registerAsistenciaService({ usuarioAct: usuarioActValue, tipo, lat, lon });
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error al registrar asistencia:', error);
    res.status(500).json({ message: 'Error al registrar asistencia', error: error.message });
  }
};

export const cargarListadoDiario = async (req, res) => {
  try {
    const usuarioCreRaw = typeof req.body?.usuarioCre !== 'undefined'
      ? req.body?.usuarioCre
      : req.query?.usuarioCre;
    if (usuarioCreRaw === null || typeof usuarioCreRaw === 'undefined' || String(usuarioCreRaw).trim() === '') {
      return res.status(400).json({ message: 'Parámetro usuarioCre es requerido' });
    }
    const rows = await cargarListadoDiarioService(usuarioCreRaw);
    res.json({ success: true, data: rows });
  } catch (error) {
    const errorMessage = String(error?.message || '');
    const missingStoredProcedure = /Could not find stored procedure\s+'sp_CargarListadoDiario'/i.test(errorMessage);
    if (missingStoredProcedure) {
      console.warn('SP sp_CargarListadoDiario no existe en la base de datos configurada. Se devuelve listado vacío.');
      return res.json({
        success: true,
        data: [],
        warning: 'SP sp_CargarListadoDiario no encontrado'
      });
    }
    console.error('Error al validar listado diario:', error);
    res.status(500).json({ message: 'Error al validar listado diario', error: error.message });
  }
};

export const getConstanteOficinas = async (req, res) => {
  try {
    const rows = await constanteOficinasService();
    const firstRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const valorFin =
      firstRow?.ValorFin ??
      firstRow?.valorFin ??
      firstRow?.ValorFinal ??
      firstRow?.valorFinal ??
      null;
    res.json({ success: true, valorFin, data: rows });
  } catch (error) {
    console.error('Error al obtener constante de oficinas:', error);
    res.status(500).json({ message: 'Error al obtener constante de oficinas', error: error.message });
  }
};

export const eliminarAsistenciaPrueba = async (req, res) => {
  try {
    const result = await eliminarAsistenciaPruebaService();
    res.json({ success: true, result, message: 'Proceso de eliminación de prueba ejecutado correctamente' });
  } catch (error) {
    console.error('Error al ejecutar sp_Asistencia_Eliminar_Prueba:', error);
    res.status(500).json({ message: 'Error al ejecutar eliminación de prueba', error: error.message });
  }
};
