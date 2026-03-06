import { cargarListadoDiarioService, constanteOficinasService, eliminarAsistenciaPruebaService, getAsistenciaService, registerAsistenciaService } from '../services/asistenciaService.js';
import { uploadImageSafely } from '../services/sharePointService.js';

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
    const { usuarioAct, codEmp, tipo, lat, lon, fechaAsistencia, comentario, estadoMarcacion, estadoSalida, imagenBase64, nombreImagen } = req.body || {};
    console.log('[registerAsistencia][BODY]', { usuarioAct, codEmp, tipo, lat, lon, fechaAsistencia, comentario, estadoMarcacion, estadoSalida, tieneImagen: !!imagenBase64 });
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
      return res.status(400).json({ message: 'El empleado/usuario no está disponible. Contacte al administrador.' });
    }

    if (!tipo) {
      return res.status(400).json({ message: 'Debe especificar INGRESO o SALIDA.' });
    }

    if (lat === null || typeof lat === 'undefined' || lon === null || typeof lon === 'undefined') {
      return res.status(400).json({ message: 'La ubicación (GPS) no pudo ser obtenida. Verifique que la ubicación esté habilitada.' });
    }

    const tipoNormalizado = String(tipo || '').trim().toUpperCase() === 'SALIDA' ? 'SALIDA' : 'INGRESO';
    const codEmpArchivo = String(codEmp || usuarioActValue || '').trim() || 'SINCOD';
    const fechaBase = fechaAsistencia ? new Date(fechaAsistencia) : new Date();
    const fechaArchivo = Number.isNaN(fechaBase.getTime())
      ? new Date()
      : fechaBase;
    const yyyy = String(fechaArchivo.getFullYear());
    const mm = String(fechaArchivo.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaArchivo.getDate()).padStart(2, '0');
    const nombreImagenFinal = `${tipoNormalizado}_${codEmpArchivo}_${yyyy}_${mm}_${dd}.jpg`;

    let uploadResult = null;
    let imagenSharePointUrl = null;
    if (imagenBase64) {
      console.log('[registerAsistencia][IMAGE_DETECTED] Preparando carga a SharePoint...');
      console.log('[registerAsistencia][IMAGE_INFO]', {
        nombreArchivo: nombreImagenFinal,
        tamañoBase64: imagenBase64.length,
        tamañoEstimadoKB: Math.round((imagenBase64.length * 0.75) / 1024),
      });
      
      try {
        uploadResult = await uploadImageSafely(imagenBase64, nombreImagenFinal);
        console.log('[registerAsistencia][UPLOAD_RESULT]', uploadResult);
        
        if (uploadResult.success) {
          imagenSharePointUrl = uploadResult.fileUrl || null;
          console.log('[registerAsistencia][✅ SUCCESS] Imagen subida exitosamente');
          console.log('[registerAsistencia][IMAGE_URL]', imagenSharePointUrl || 'N/A');
        } else {
          console.warn('[registerAsistencia][⚠️ FAILED] No se pudo subir imagen:', uploadResult.error);
        }
      } catch (error) {
        console.error('[registerAsistencia][UPLOAD_ERROR]', error.message);
        console.error('[registerAsistencia][UPLOAD_ERROR_STACK]', error.stack);
        uploadResult = { success: false, error: error.message, pendingUpload: true };
      }
    } else {
      console.log('[registerAsistencia][NO_IMAGE] No se envió imagen en el request');
    }

    let result;
    try {
      result = await registerAsistenciaService({
        usuarioAct: usuarioActValue,
        tipo,
        lat,
        lon,
        comentario,
        estadoMarcacion,
        estadoSalida,
        imagen: imagenSharePointUrl,
      });
    } catch (error) {
      const errorMsg = error?.message || String(error);
      console.error('[registerAsistencia][SERVICE_ERROR]', errorMsg);
      
      // Analizar errores comunes de la base de datos
      if (errorMsg.includes('Violation of PRIMARY KEY constraint')) {
        return res.status(409).json({ message: 'Ya existe un registro para esta fecha y hora. No se puede registrar duplicado.' });
      }
      if (errorMsg.includes('Cannot insert NULL') || errorMsg.includes('NULL value')) {
        return res.status(400).json({ message: 'Faltan datos requeridos para el registro. Verifique todos los campos.' });
      }
      if (errorMsg.includes('stored procedure') || errorMsg.includes('sp_Asistencia')) {
        return res.status(500).json({ message: 'Error en la base de datos. Contacte al administrador.' });
      }
      
      return res.status(500).json({ message: errorMsg || 'Error al registrar asistencia 1' });
    }
    
    console.log('[registerAsistencia][FINAL_RESPONSE]', {
      asistenciaRegistrada: true,
      imagenEnviada: !!imagenBase64,
      imagenSubida: uploadResult?.success || false,
      imagenSharePointUrl: imagenSharePointUrl || null,
    });
    
    res.json({ success: true, result, imageUpload: uploadResult, imagen: imagenSharePointUrl });
  } catch (error) {
    console.error('[registerAsistencia][CONTROLLER_ERROR]', error);
    const errorMsg = error?.message || String(error);
    res.status(500).json({ message: errorMsg || 'Error al registrar asistencia 2' });
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
