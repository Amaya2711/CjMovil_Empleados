import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Platform, Linking, ScrollView, Pressable, Text as RNText, Image } from 'react-native';
import { Text, Button, IconButton, Card, DataTable, Snackbar, Portal, Dialog, MD3Colors, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { getAsistencia, getConstanteOficinas, registerAsistencia, validarListadoDiario } from '../api/asistencia';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useCallback, useMemo } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
// Devuelve la hora en la zona America/Lima; si Intl/timeZone no está disponible, aplica UTC-5
const getLimaDate = () => {
  try {
    const limaStr = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
    const d = new Date(limaStr);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    // fallthrough al fallback
  }
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  return new Date(utc.getTime() - 5 * 60 * 60000);
};

export default function ViewAsistencia() {
  const SHOW_SALIDA_BUTTON = true;
  const MAX_DISTANCE_METERS = 50;
  const MAX_GPS_ACCURACY_METERS = 20;
  const LOCATION_REQUIRED_MESSAGE = 'Debe activar la ubicación para registrar INGRESO o SALIDA. Sin ubicación no se grabará la marcación.';
  const { codEmp, idusuario, cuadrilla } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('REGISTRO');
  const [selectedResumenEstado, setSelectedResumenEstado] = useState(null);
  // avoid logging before state initialization
  // time moved to TimeClock component to avoid re-rendering this screen every second
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiDebug, setApiDebug] = useState(null);
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  const [loadingCompareLocation, setLoadingCompareLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(true);
  const [idEstadoDiario, setIdEstadoDiario] = useState(null);
  const [valorFin, setValorFin] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [ingresoDialogVisible, setIngresoDialogVisible] = useState(false);
  const [ingresoComentario, setIngresoComentario] = useState('');
  const [ingresoFoto, setIngresoFoto] = useState(null);
  const [pendingIngresoCoords, setPendingIngresoCoords] = useState(null);
  const [pendingIngresoWarning, setPendingIngresoWarning] = useState('');
  const [registerActionRunning, setRegisterActionRunning] = useState(false);
  const [confirmIngresoLoading, setConfirmIngresoLoading] = useState(false);
  const [salidaDialogVisible, setSalidaDialogVisible] = useState(false);
  const [salidaComentario, setSalidaComentario] = useState('');
  const [salidaFoto, setSalidaFoto] = useState(null);
  const [pendingSalidaCoords, setPendingSalidaCoords] = useState(null);
  const [pendingSalidaWarning, setPendingSalidaWarning] = useState('');
  const [confirmSalidaLoading, setConfirmSalidaLoading] = useState(false);
  const pageSize = 31; // show up to 31 records in one page by default
  const mounted = useRef(true);

  useEffect(() => {
    const source = Array.isArray(data) ? data : [];
    console.log('[ViewAsistencia][RESUMEN] Total de registros:', source.length);
    console.log('[ViewAsistencia][RESUMEN] Registros cargados:', source);
  }, [data]);

  

  const formatDate = (val) => {
    if (!val && val !== 0) return '';
    try {
      // Si es string en formato YYYY-MM-DD o similar, extraer directamente sin conversión de zona horaria
      if (typeof val === 'string') {
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          const [, yyyy, mm, dd] = match;
          return `${dd}-${mm}-${yyyy}`;
        }
      }
      
      let d;
      if (val instanceof Date) d = val;
      else if (typeof val === 'number' || /^\d+$/.test(String(val))) d = new Date(Number(val));
      else d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch (e) {
      return String(val);
    }
  };

        const formatDateDayMonth = (val) => {
          if (!val && val !== 0) return '';
          try {
            // Si es string en formato YYYY-MM-DD o similar, extraer directamente sin conversión de zona horaria
            if (typeof val === 'string') {
              const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (match) {
                const [, , mm, dd] = match;
                return `${dd}-${mm}`;
              }
            }
            
            let d;
            if (val instanceof Date) d = val;
            else if (typeof val === 'number' || /^\d+$/.test(String(val))) d = new Date(Number(val));
            else d = new Date(val);
            if (isNaN(d.getTime())) return String(val);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}-${mm}`;
          } catch (e) {
            return String(val);
          }
        };

        const formatTime = (val) => {
          if (!val && val !== 0) return '';
          try {
            if (typeof val === 'string') {
              // Si ya viene en formato HH:mm:ss o HH:mm:ss.SSS
              const timeMatch = val.match(/(\d{2}):(\d{2}):(\d{2})/);
              if (timeMatch) {
                return `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`;
              }
              // Si es un ISO string completo, extraer solo la hora
              const isoMatch = val.match(/T(\d{2}):(\d{2}):(\d{2})/);
              if (isoMatch) {
                return `${isoMatch[1]}:${isoMatch[2]}:${isoMatch[3]}`;
              }
            }
            // Si es Date, extraer hora local
            if (val instanceof Date && !isNaN(val.getTime())) {
              const hh = String(val.getHours()).padStart(2, '0');
              const mm = String(val.getMinutes()).padStart(2, '0');
              const ss = String(val.getSeconds()).padStart(2, '0');
              return `${hh}:${mm}:${ss}`;
            }
            return '';
          } catch (e) {
            return '';
          }
        };

        const formatEstadoLabel = (val) => {
          const raw = val === null || typeof val === 'undefined' ? '' : String(val).trim();
          if (!raw) return 'SIN ESTADO';
          if (raw === '0') return 'NO LLENADO';
          return raw;
        };


        const parseReferenceCoords = (referenceValue) => {
          if (!referenceValue && referenceValue !== 0) return null;

          const toNumber = (value) => {
            if (value === null || typeof value === 'undefined') return NaN;
            const normalized = String(value).trim().replace(',', '.');
            return Number(normalized);
          };

          const isValidLatitude = (value) => Number.isFinite(value) && value >= -90 && value <= 90;
          const isValidLongitude = (value) => Number.isFinite(value) && value >= -180 && value <= 180;

          const normalizeLatLon = (first, second) => {
            const a = toNumber(first);
            const b = toNumber(second);
            if (isValidLatitude(a) && isValidLongitude(b)) {
              return { latitude: a, longitude: b };
            }
            // Algunos formatos pueden venir como lon,lat
            if (isValidLatitude(b) && isValidLongitude(a)) {
              return { latitude: b, longitude: a };
            }
            return null;
          };

          if (typeof referenceValue === 'object') {
            const latObj = referenceValue?.Latitud ?? referenceValue?.lat ?? referenceValue?.latitude ?? null;
            const lonObj = referenceValue?.Longitud ?? referenceValue?.lon ?? referenceValue?.longitude ?? null;
            if (latObj !== null && lonObj !== null) {
              const normalized = normalizeLatLon(latObj, lonObj);
              if (normalized) return normalized;
            }
          }

          const raw = String(referenceValue).trim();
          if (!raw) return null;

          // Formato típico: "lat,lon" o "lat;lon" o "lat lon"
          const pairMatch = raw.match(/^\s*(-?\d+(?:[\.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[\.,]\d+)?)\s*$/);
          if (pairMatch) {
            const normalized = normalizeLatLon(pairMatch[1], pairMatch[2]);
            if (normalized) return normalized;
          }

          // Fallback para formatos con texto (ej. POINT(-76.95 -12.07))
          const matches = raw.match(/-?\d+(?:\.\d+)?/g);
          if (!matches || matches.length < 2) return null;
          return normalizeLatLon(matches[0], matches[1]);
        };

        const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
          const toRadians = (value) => (value * Math.PI) / 180;
          const earthRadius = 6371000;
          const dLat = toRadians(lat2 - lat1);
          const dLon = toRadians(lon2 - lon1);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return earthRadius * c;
        };

        const getDistanceToRequiredPoint = (coords) => {
          if (coords?.latitude === null || typeof coords?.latitude === 'undefined' || coords?.longitude === null || typeof coords?.longitude === 'undefined') return null;
          const refCoords = parseReferenceCoords(valorFin);
          if (!refCoords) return null;
          return calculateDistanceMeters(
            Number(coords.latitude),
            Number(coords.longitude),
            Number(refCoords.latitude),
            Number(refCoords.longitude)
          );
        };

        useFocusEffect(
          useCallback(() => {
            mounted.current = true;
            checkLocationEnabled();
            refreshCurrentCoordinates();
            fetchData();
            return () => {
              mounted.current = false;
            };
          }, [cuadrilla, codEmp, idusuario])
        );

        const checkLocationEnabled = async () => {
          try {
            const servicesEnabled = await Location.hasServicesEnabledAsync();
            if (!servicesEnabled) {
              setHasLocation(false);
              return false;
            }
            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
              setHasLocation(false);
              return false;
            }
            setHasLocation(true);
            return true;
          } catch (e) {
            setHasLocation(false);
            return false;
          }
        };

        const fetchData = async () => {
          setLoading(true);
          try {
            const idEmpleado = cuadrilla || codEmp || idusuario;
            const todayLima = getLimaDate();
            const fechaAsistencia = `${todayLima.getFullYear()}-${String(todayLima.getMonth() + 1).padStart(2, '0')}-${String(todayLima.getDate()).padStart(2, '0')}`;

            const constanteOficinas = await getConstanteOficinas();
            if (!mounted.current) return;
            if (constanteOficinas && !constanteOficinas.error) {
              const valorFinResponse =
                constanteOficinas?.valorFin ??
                constanteOficinas?.valorFinal ??
                (Array.isArray(constanteOficinas?.data) && constanteOficinas.data[0]
                  ? (
                      constanteOficinas.data[0].ValorFin ??
                      constanteOficinas.data[0].valorFin ??
                      constanteOficinas.data[0].ValorFinal ??
                      constanteOficinas.data[0].valorFinal ??
                      null
                    )
                  : null);
              setValorFin(valorFinResponse);
            } else if (constanteOficinas?.error) {
              setMessage(constanteOficinas?.message || 'No se pudo obtener ValorFin');
            }

            const usuarioCre = cuadrilla || idusuario || codEmp;
            if (!usuarioCre) {
              const technicalDetail = 'usuarioCre no disponible';
              const showDevDetail = typeof __DEV__ !== 'undefined' && __DEV__;
              if (showDevDetail) {
                setMessage(`No pudimos validar el listado diario. (${technicalDetail})`);
              }
              setApiDebug(`listado-diario:${technicalDetail}`);
              console.warn('Validación listado diario omitida:', technicalDetail);
              setIdEstadoDiario(null);
            } else {
              const validacion = await validarListadoDiario({ usuarioCre });
              if (!mounted.current) return;
              if (!validacion || validacion.error) {
                const technicalDetail = validacion?.message || 'No se pudo validar el listado diario';
                const showDevDetail = typeof __DEV__ !== 'undefined' && __DEV__;
                if (showDevDetail) {
                  setMessage(`No pudimos validar el listado diario. (${technicalDetail})`);
                }
                setApiDebug(`listado-diario:${technicalDetail}`);
                console.warn('Validación listado diario falló:', technicalDetail);
                setIdEstadoDiario(null);
              } else {
                const listadoDiario = Array.isArray(validacion?.data)
                  ? validacion.data
                  : Array.isArray(validacion)
                    ? validacion
                    : [];
                const primerRegistro = listadoDiario[0] || null;
                const estado = primerRegistro?.IdEstado ?? primerRegistro?.idEstado ?? null;
                setIdEstadoDiario(estado);
              }
            }

            const res = await getAsistencia({ codEmp: idEmpleado, fechaAsistencia });
            if (!mounted.current) return;
            if (!res) {
              setMessage('Respuesta vacía del servidor');
              setData([]);
              setApiDebug('null');
            } else if (res.error) {
              setMessage(res.message || 'Error al obtener datos');
              setData([]);
              setApiDebug(JSON.stringify(res));
            } else if (Array.isArray(res)) {
              console.log('[ViewAsistencia] Datos recibidos del servidor:', res);
              if (res.length > 0) {
                console.log('[ViewAsistencia] Primer registro - Hora:', res[0].Hora ?? res[0].hora, 'HoraSalida:', res[0].HoraSalida ?? res[0].horaSalida);
              }
              setData(res);
              setApiDebug(`array:${res.length}`);
            } else if (res.data && Array.isArray(res.data)) {
              console.log('[ViewAsistencia] Datos recibidos del servidor:', res.data);
              if (res.data.length > 0) {
                console.log('[ViewAsistencia] Primer registro - Hora:', res.data[0].Hora ?? res.data[0].hora, 'HoraSalida:', res.data[0].HoraSalida ?? res.data[0].horaSalida);
              }
              setData(res.data);
              setApiDebug(`payload.data:${res.data.length}`);
            } else {
              setData([]);
              setApiDebug(JSON.stringify(res));
              setMessage('Respuesta inesperada del servidor');
            }
          } catch (error) {
            if (!mounted.current) return;
            console.error('[ViewAsistencia][fetchData] Error:', error);
            setData([]);
            setMessage('No se pudo cargar asistencia en este momento.');
            setApiDebug(String(error?.message || error));
          } finally {
            if (mounted.current) {
              setLoading(false);
            }
          }
        };

        useEffect(() => {
          const distance = getDistanceToRequiredPoint(currentCoords);
          if (distance !== null && distance > MAX_DISTANCE_METERS) {
            setMessage('La ubicación no es cercana al punto requerido (máximo 50 metros).');
          }
        }, [currentCoords, valorFin]);

        const requestLocationPermission = async () => {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status === 'granted';
          } catch (e) {
            return false;
          }
        };

        const openLocationSettings = async () => {
          if (Platform.OS === 'android') {
            // Intent to open Location Source Settings; fallback to app settings
            const intentUrl = 'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end';
            try {
              await Linking.openURL(intentUrl);
            } catch (e) {
              Linking.openSettings();
            }
            return;
          }
          // iOS fallback
          Linking.openSettings();
        };

        const getCurrentPosition = async () => {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest, maximumAge: 1000, timeout: 7000 });
            const { latitude, longitude, accuracy } = loc.coords;
            const isFiniteCoords = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
            const isDefaultAndroidEmulatorPoint =
              Math.abs(Number(latitude) - 37.4219983) < 0.0006 &&
              Math.abs(Number(longitude) - (-122.084)) < 0.0006;

            if (!isFiniteCoords) {
              throw new Error('No se pudo obtener coordenadas válidas del GPS.');
            }

            if ((Platform.OS === 'android' && loc?.mocked) || isDefaultAndroidEmulatorPoint) {
              throw new Error('El emulador está usando ubicación por defecto. Configure una ubicación en el emulador o use un dispositivo físico.');
            }
            return { latitude, longitude, accuracy };
          } catch (e) {
            throw e;
          }
        };

        const refreshCurrentCoordinates = async () => {
          try {
            const okPerm = await requestLocationPermission();
            if (!okPerm) {
              setCurrentCoords(null);
              return;
            }
            const enabled = await checkLocationEnabled();
            if (!enabled) {
              setCurrentCoords(null);
              return;
            }
            const coords = await getCurrentPosition();
            if (!mounted.current) return;
            setCurrentCoords(coords);
          } catch (e) {
            if (!mounted.current) return;
            setCurrentCoords(null);
          }
        };

        const handleRegister = async (tipo) => {
          if (registerActionRunning) return;
          setRegisterActionRunning(true);
          if (tipo === 'SALIDA') {
            console.log('[SALIDA][CLICK] Botón SALIDA presionado');
          }
          // Verificar permiso y estado de ubicación
          const okPerm = await requestLocationPermission();
          if (!okPerm) {
            setHasLocation(false);
            setMessage(LOCATION_REQUIRED_MESSAGE);
            return;
          }
          const enabled = await checkLocationEnabled();
          if (!enabled) {
            setMessage(LOCATION_REQUIRED_MESSAGE);
            return;
          }
          try {
            const coords = await getCurrentPosition();
            if (tipo === 'SALIDA') {
              console.log('[SALIDA][COORDS]', {
                latitude: coords?.latitude,
                longitude: coords?.longitude,
                accuracy: coords?.accuracy,
              });
            }
            let warningMessage = '';
            if (coords?.accuracy && coords.accuracy > MAX_GPS_ACCURACY_METERS) {
              warningMessage = `Precisión GPS insuficiente. Debe ser ≤ ${MAX_GPS_ACCURACY_METERS} m.`;
            }
            const distance = getDistanceToRequiredPoint(coords);
            if (distance !== null && distance > MAX_DISTANCE_METERS) {
              warningMessage = warningMessage
                ? `${warningMessage} La ubicación no es cercana al punto requerido (máximo 50 metros).`
                : 'La ubicación no es cercana al punto requerido (máximo 50 metros).';
            }
            if (tipo === 'INGRESO') {
              setPendingIngresoCoords(coords);
              setPendingIngresoWarning(warningMessage);
              setIngresoComentario('');
              setIngresoFoto(null);
              setIngresoDialogVisible(true);
              return;
            }
            if (tipo === 'SALIDA') {
              setPendingSalidaCoords(coords);
              setPendingSalidaWarning(warningMessage);
              setSalidaComentario('');
              setSalidaFoto(null);
              setSalidaDialogVisible(true);
              return;
            }
            await executeRegister(tipo, coords, warningMessage);
          } catch (err) {
            setMessage(LOCATION_REQUIRED_MESSAGE);
          } finally {
            setRegisterActionRunning(false);
          }
        };

        const executeRegister = async (tipo, coords, warningMessage = '', comentario = '', imagenBase64 = null, nombreImagen = null) => {
          const usuarioAct = cuadrilla;
          if (tipo === 'SALIDA') {
            console.log('[SALIDA][PAYLOAD_PREP]', {
              usuarioAct,
              tipo,
              lat: coords?.latitude,
              lon: coords?.longitude,
            });
          }
          if (usuarioAct === null || typeof usuarioAct === 'undefined' || String(usuarioAct).trim() === '') {
            setMessage('No se pudo registrar asistencia: cuadrilla no disponible.');
            return;
          }

          const isMobileApp = Platform.OS === 'android' || Platform.OS === 'ios';
          const hasValidCoords = Number.isFinite(Number(coords?.latitude)) && Number.isFinite(Number(coords?.longitude));
          if (isMobileApp && !hasValidCoords) {
            setMessage(LOCATION_REQUIRED_MESSAGE);
            return;
          }

          setLoading(true);
          const todayLima = getLimaDate();
          const fechaAsistencia = `${todayLima.getFullYear()}-${String(todayLima.getMonth() + 1).padStart(2, '0')}-${String(todayLima.getDate()).padStart(2, '0')}`;
          const codEmp = usuarioAct;
          const estadoValidacion = 9;
          const res = await registerAsistencia({
            usuarioAct,
            codEmp,
            tipo,
            lat: coords?.latitude,
            lon: coords?.longitude,
            fechaAsistencia,
            comentario: String(comentario || '').trim(),
            estadoMarcacion: tipo === 'INGRESO' ? estadoValidacion : undefined,
            estadoSalida: tipo === 'SALIDA' ? estadoValidacion : undefined,
                      imagenBase64: imagenBase64 || undefined,
                      nombreImagen: nombreImagen || undefined,
          });
          setLoading(false);
          
          // Log completo de la respuesta para debugging
          console.log('[executeRegister][RESPONSE_COMPLETA]', JSON.stringify(res, null, 2));
          
          if (res && !res.error) {
            let msg = warningMessage 
              ? `${warningMessage} ${tipo} registrado correctamente` 
              : `${tipo} registrado correctamente`;
            
            // 🔍 VALIDACIÓN TEMPORAL: Verificar estado de carga de imagen
            if (imagenBase64 && nombreImagen) {
              console.log('[executeRegister][IMAGE_CHECK] Se envió imagen, validando resultado...');
              console.log('[executeRegister][IMAGE_UPLOAD_RESULT]', res.imageUpload);
              
              if (res.imageUpload) {
                if (res.imageUpload.success === true) {
                  msg += ' ✅ IMAGEN SUBIDA A SHAREPOINT';
                  console.log('[executeRegister][IMAGE_SUCCESS] URL:', res.imageUpload.fileUrl);
                } else {
                  msg += ` ⚠️ IMAGEN NO SUBIDA: ${res.imageUpload.error || 'Error desconocido'}`;
                  console.warn('[executeRegister][IMAGE_FAILED]', res.imageUpload);
                }
              } else {
                msg += ' ⚠️ NO HAY RESPUESTA DE SHAREPOINT';
                console.warn('[executeRegister][IMAGE_NO_RESPONSE] imageUpload es null/undefined');
              }
            }
            
            setMessage(msg);
            setActiveTab('RESUMEN');
            setSelectedResumenEstado('__ALL__');
            await fetchData();
          } else {
            // Mostrar mensaje de error detallado
            const errorDetails = res.message || 'Error al registrar asistencia';
            console.error('[executeRegister][ERROR_DETAIL]', { tipo, errorDetails });
            setMessage(`${errorDetails}. Si el problema persiste, contacte al administrador.`);
          }
        };

        const handleViewCurrentLocation = () => {
          setLocationDialogVisible(true);
        };

        const closeIngresoDialog = () => {
          setIngresoDialogVisible(false);
          setIngresoComentario('');
          setIngresoFoto(null);
          setPendingIngresoCoords(null);
          setPendingIngresoWarning('');
        };

        const closeSalidaDialog = () => {
          setSalidaDialogVisible(false);
          setSalidaComentario('');
          setSalidaFoto(null);
          setPendingSalidaCoords(null);
          setPendingSalidaWarning('');
        };

        const redimensionarImagen = async (sourceUri, width, height) => {
          console.log('[redimensionarImagen] INICIO - sourceUri:', sourceUri);
          console.log('[redimensionarImagen] Dimensiones objetivo:', { width, height });
          
          try {
            console.log('[redimensionarImagen] Llamando ImageManipulator con base64...');
            const resultado = await ImageManipulator.manipulateAsync(
              sourceUri,
              [{ resize: { width, height } }],
              // Compress: 0.9 = calidad HD con pérdida mínima
              { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            
            console.log('[redimensionarImagen] ✓ Resultado obtenido');
            console.log('[redimensionarImagen] Base64 length:', resultado.base64?.length || 0);
            
            if (!resultado.base64) {
              throw new Error('ImageManipulator no devolvió base64');
            }
            
            return resultado.base64;
          } catch (error) {
            console.error('[redimensionarImagen] ✗ ERROR:', error.message);
            console.error('[redimensionarImagen] Stack:', error.stack);
            throw new Error(`Redimensionamiento fallido: ${error.message}`);
          }
        };

        const convertImageToBase64 = async (asset) => {
          console.log('[convertImageToBase64] ========== CONVERSIÓN INICIO ==========');
          console.log('[convertImageToBase64] Asset:', { uri: asset?.uri, width: asset?.width, height: asset?.height });
          
          let sourceUri = asset?.uri || asset?.localUri;
          if (!sourceUri) {
            throw new Error('Sin URI de imagen');
          }
          console.log('[convertImageToBase64] ✓ URI válida');

          try {
            // Step 1: Redimensionar y obtener base64 directamente de ImageManipulator
            const ancho = asset?.width || 1920;
            const alto = asset?.height || 1080;
            // Configuración HD para SharePoint
            // MAX_HEIGHT: 800 (normal) | 1080 (Full HD) | 1920 (Ultra HD)
            const MAX_HEIGHT = 1920;
            const ratio = ancho / alto;
            const newHeight = Math.min(alto, MAX_HEIGHT);
            const newWidth = Math.round(newHeight * ratio);
            
            console.log('[convertImageToBase64] → Redimensionando ' + ancho + 'x' + alto + ' → ' + newWidth + 'x' + newHeight);
            const base64String = await redimensionarImagen(sourceUri, newWidth, newHeight);
            
            if (!base64String) {
              throw new Error('Base64 vacío');
            }
            
            console.log('[convertImageToBase64] ✓ Base64 obtenido:', base64String.length + ' caracteres');
            console.log('[convertImageToBase64] ========== CONVERSIÓN OK ==========');
            return base64String;
          } catch (error) {
            console.error('[convertImageToBase64] ✗ Error:', error.message);
            console.error('[convertImageToBase64] Stack:', error.stack);
            throw error;
          }
        };

        const tomarFotoIngreso = async () => {
          try {
            console.log('[tomarFotoIngreso] Solicitando permiso de cámara...');
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            console.log('[tomarFotoIngreso] Estado permiso cámara:', status);
            
            if (status !== 'granted') {
              setMessage('Se requiere permiso de camara para tomar foto');
              console.warn('[tomarFotoIngreso] Permiso cámara rechazado');
              return;
            }
            
            console.log('[tomarFotoIngreso] Abriendo cámara...');
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              // Quality: 1.0 = sin compresión (máxima calidad HD)
              quality: 1.0,
              base64: false,
            });
            
            console.log('[tomarFotoIngreso] Resultado cámara:', {
              canceled: result.canceled,
              assetsLength: result.assets?.length,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              console.log('[tomarFotoIngreso] ✓ Foto capturada exitosamente:', {
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                type: asset.type,
                fileName: asset.fileName,
              });
              
              if (!asset?.uri) {
                setMessage('No se pudo procesar la foto tomada. Intente nuevamente.');
                console.error('[tomarFotoIngreso] ✗ Asset sin URI');
                return;
              }
              setIngresoFoto(asset);
            } else {
              console.log('[tomarFotoIngreso] Captura cancelada por el usuario');
            }
          } catch (error) {
            console.error('[tomarFotoIngreso] ✗ Error:', error.message);
            console.error('[tomarFotoIngreso] Stack:', error.stack);
            setMessage('Error al tomar foto: ' + error.message);
          }
        };

        const tomarFotoSalida = async () => {
          try {
            console.log('[tomarFotoSalida] Solicitando permiso de cámara...');
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            console.log('[tomarFotoSalida] Estado permiso cámara:', status);
            
            if (status !== 'granted') {
              setMessage('Se requiere permiso de camara para tomar foto');
              console.warn('[tomarFotoSalida] Permiso cámara rechazado');
              return;
            }
            
            console.log('[tomarFotoSalida] Abriendo cámara...');
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 1.0,
              base64: false,
            });
            
            console.log('[tomarFotoSalida] Resultado cámara:', {
              canceled: result.canceled,
              assetsLength: result.assets?.length,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              console.log('[tomarFotoSalida] ✓ Foto capturada exitosamente:', {
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                type: asset.type,
                fileName: asset.fileName,
              });
              
              if (!asset?.uri) {
                setMessage('No se pudo procesar la foto tomada. Intente nuevamente.');
                console.error('[tomarFotoSalida] ✗ Asset sin URI');
                return;
              }
              setSalidaFoto(asset);
            } else {
              console.log('[tomarFotoSalida] Captura cancelada por el usuario');
            }
          } catch (error) {
            console.error('[tomarFotoSalida] ✗ Error:', error.message);
            console.error('[tomarFotoSalida] Stack:', error.stack);
            setMessage('Error al tomar foto: ' + error.message);
          }
        };

        const seleccionarImagenSalida = async () => {
          try {
            console.log('[seleccionarImagenSalida] Solicitando permiso de librería de medios...');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('[seleccionarImagenSalida] Estado permiso galería:', status);
            
            if (status !== 'granted') {
              setMessage('Se requiere permiso de galeria para seleccionar foto');
              console.warn('[seleccionarImagenSalida] Permiso galería rechazado');
              return;
            }
            
            console.log('[seleccionarImagenSalida] Abriendo galería...');
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 1.0,
              base64: false,
            });
            
            console.log('[seleccionarImagenSalida] Resultado galería:', {
              canceled: result.canceled,
              assetsLength: result.assets?.length,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              console.log('[seleccionarImagenSalida] ✓ Imagen seleccionada exitosamente:', {
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                type: asset.type,
                fileName: asset.fileName,
              });
              
              if (!asset?.uri) {
                setMessage('No se pudo procesar la imagen seleccionada. Intente con otra imagen.');
                console.error('[seleccionarImagenSalida] ✗ Asset sin URI');
                return;
              }
              setSalidaFoto(asset);
            } else {
              console.log('[seleccionarImagenSalida] Selección cancelada por el usuario');
            }
          } catch (error) {
            console.error('[seleccionarImagenSalida] ✗ Error:', error.message);
            console.error('[seleccionarImagenSalida] Stack:', error.stack);
            setMessage('Error al seleccionar imagen: ' + error.message);
          }
        };

        const seleccionarImagenIngreso = async () => {
          try {
            console.log('[seleccionarImagenIngreso] Solicitando permiso de librería de medios...');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('[seleccionarImagenIngreso] Estado permiso galería:', status);
            
            if (status !== 'granted') {
              setMessage('Se requiere permiso de galeria para seleccionar foto');
              console.warn('[seleccionarImagenIngreso] Permiso galería rechazado');
              return;
            }
            
            console.log('[seleccionarImagenIngreso] Abriendo galería...');
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              // Quality: 1.0 = sin compresión (máxima calidad HD)
              quality: 1.0,
              base64: false,
            });
            
            console.log('[seleccionarImagenIngreso] Resultado galería:', {
              canceled: result.canceled,
              assetsLength: result.assets?.length,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              console.log('[seleccionarImagenIngreso] ✓ Imagen seleccionada exitosamente:', {
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                type: asset.type,
                fileName: asset.fileName,
              });
              
              if (!asset?.uri) {
                setMessage('No se pudo procesar la imagen seleccionada. Intente con otra imagen.');
                console.error('[seleccionarImagenIngreso] ✗ Asset sin URI');
                return;
              }
              setIngresoFoto(asset);
            } else {
              console.log('[seleccionarImagenIngreso] Selección cancelada por el usuario');
            }
          } catch (error) {
            console.error('[seleccionarImagenIngreso] ✗ Error:', error.message);
            console.error('[seleccionarImagenIngreso] Stack:', error.stack);
            setMessage('Error al seleccionar imagen: ' + error.message);
          }
        };

        const confirmIngresoRegister = async () => {
          if (confirmIngresoLoading || registerActionRunning) return;
          const comentario = String(ingresoComentario || '').trim();
          if (!comentario) {
            setMessage('Debe ingresar el motivo del comentario para registrar INGRESO.');
            return;
          }
          if (!ingresoFoto) {
            setMessage('Debe capturar o cargar una foto de ingreso (obligatorio).');
            return;
          }
          if (!pendingIngresoCoords) {
            setMessage('No se pudo obtener la ubicacion actual para registrar INGRESO.');
            return;
          }
          setConfirmIngresoLoading(true);
          try {
            let imagenBase64 = null;
            let nombreImagen = null;
            if (ingresoFoto && (ingresoFoto.uri || ingresoFoto.localUri)) {
              try {
                console.log('[confirmIngresoRegister] ========== INICIANDO PROCESAMIENTO DE IMAGEN ==========');
                console.log('[confirmIngresoRegister] Foto seleccionada:', {
                  uri: ingresoFoto.uri,
                  width: ingresoFoto.width,
                  height: ingresoFoto.height,
                });
                
                imagenBase64 = await convertImageToBase64(ingresoFoto);
                
                const imageBytes = imagenBase64.length * 0.75;
                const sizeInKB = (imageBytes / 1024).toFixed(2);
                const sizeInMB = (imageBytes / 1024 / 1024).toFixed(2);
                console.log('[confirmIngresoRegister] ✓ Imagen convertida a base64 - Tamaño:', sizeInKB, 'KB (~' + sizeInMB + 'MB)');
                
                // Límite aumentado para permitir imágenes HD: 5MB (5120KB)
                const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
                if (imageBytes > MAX_IMAGE_BYTES) {
                  console.warn('[confirmIngresoRegister] ✗ RECHAZO: Imagen muy grande (' + sizeInKB + 'KB > 5MB)');
                  setMessage('La imagen excede el límite permitido para producción (' + sizeInMB + 'MB de 5MB). Intente una foto más cercana o con menos detalle.');
                  return;
                }
                
                const d = getLimaDate();
                const yyyy = String(d.getFullYear());
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const codEmpArchivo = String(cuadrilla || codEmp || idusuario || 'SINCOD').trim();
                nombreImagen = `INGRESO_${codEmpArchivo}_${yyyy}_${mm}_${dd}.jpg`;
                console.log('[confirmIngresoRegister] ✓ Nombre de imagen asignado:', nombreImagen);
                console.log('[confirmIngresoRegister] ========== PROCESAMIENTO DE IMAGEN COMPLETADO ==========');
              } catch (error) {
                console.error('[confirmIngresoRegister] ✗ ERROR imagen:', error.message);
                console.error('[confirmIngresoRegister] Stack:', error.stack);
                
                let userMsg = 'Error al procesar imagen: ';
                if (error.message.includes('no existe') || error.message.includes('no exists')) {
                  userMsg += 'Archivo no accesible. Recapture la foto.';
                } else if (error.message.includes('Redimensionamiento')) {
                  userMsg += 'Problema al redimensionar. Intente otra foto.';
                } else if (error.message.includes('base64') || error.message.includes('leer')) {
                  userMsg += 'Problema al procesar. Reconecte la foto.';
                } else if (error.message.includes('copia')) {
                  userMsg += 'Problema de almacenamiento. Libere espacio.';
                } else {
                  userMsg += error.message;
                }
                
                setMessage(userMsg);
                return;
              }
            }
            await executeRegister('INGRESO', pendingIngresoCoords, pendingIngresoWarning, comentario, imagenBase64, nombreImagen);
            setIngresoDialogVisible(false);
            setIngresoComentario('');
            setIngresoFoto(null);
            setPendingIngresoCoords(null);
            setPendingIngresoWarning('');
          } finally {
            setConfirmIngresoLoading(false);
          }
        };

        const confirmSalidaRegister = async () => {
          if (confirmSalidaLoading || registerActionRunning) return;
          const comentario = String(salidaComentario || '').trim();
          if (!comentario) {
            setMessage('Debe ingresar el motivo del comentario para registrar SALIDA.');
            return;
          }
          if (!salidaFoto) {
            setMessage('Debe capturar o cargar una foto de salida (obligatorio).');
            return;
          }
          if (!pendingSalidaCoords) {
            setMessage('No se pudo obtener la ubicacion actual para registrar SALIDA.');
            return;
          }
          setConfirmSalidaLoading(true);
          try {
            let imagenBase64 = null;
            let nombreImagen = null;
            if (salidaFoto && (salidaFoto.uri || salidaFoto.localUri)) {
              try {
                console.log('[confirmSalidaRegister] ========== INICIANDO PROCESAMIENTO DE IMAGEN ==========');
                console.log('[confirmSalidaRegister] Foto seleccionada:', {
                  uri: salidaFoto.uri,
                  width: salidaFoto.width,
                  height: salidaFoto.height,
                });
                
                imagenBase64 = await convertImageToBase64(salidaFoto);
                
                const imageBytes = imagenBase64.length * 0.75;
                const sizeInKB = (imageBytes / 1024).toFixed(2);
                const sizeInMB = (imageBytes / 1024 / 1024).toFixed(2);
                console.log('[confirmSalidaRegister] ✓ Imagen convertida a base64 - Tamaño:', sizeInKB, 'KB (~' + sizeInMB + 'MB)');
                
                // Límite aumentado para permitir imágenes HD: 5MB (5120KB)
                const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
                if (imageBytes > MAX_IMAGE_BYTES) {
                  console.warn('[confirmSalidaRegister] ✗ RECHAZO: Imagen muy grande (' + sizeInKB + 'KB > 5MB)');
                  setMessage('La imagen excede el límite permitido para producción (' + sizeInMB + 'MB de 5MB). Intente una foto más cercana o con menos detalle.');
                  return;
                }
                
                const d = getLimaDate();
                const yyyy = String(d.getFullYear());
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const codEmpArchivo = String(cuadrilla || codEmp || idusuario || 'SINCOD').trim();
                nombreImagen = `SALIDA_${codEmpArchivo}_${yyyy}_${mm}_${dd}.jpg`;
                console.log('[confirmSalidaRegister] ✓ Nombre de imagen asignado:', nombreImagen);
                console.log('[confirmSalidaRegister] ========== PROCESAMIENTO DE IMAGEN COMPLETADO ==========');
              } catch (error) {
                console.error('[confirmSalidaRegister] ✗ ERROR imagen:', error.message);
                console.error('[confirmSalidaRegister] Stack:', error.stack);
                
                let userMsg = 'Error al procesar imagen: ';
                if (error.message.includes('no existe') || error.message.includes('no exists')) {
                  userMsg += 'Archivo no accesible. Recapture la foto.';
                } else if (error.message.includes('Redimensionamiento')) {
                  userMsg += 'Problema al redimensionar. Intente otra foto.';
                } else if (error.message.includes('base64') || error.message.includes('leer')) {
                  userMsg += 'Problema al procesar. Reconecte la foto.';
                } else if (error.message.includes('copia')) {
                  userMsg += 'Problema de almacenamiento. Libere espacio.';
                } else {
                  userMsg += error.message;
                }
                
                setMessage(userMsg);
                return;
              }
            }
            
            // IMPORTANTE: Obtener comentario existente del último registro y agregarlo
            const source = Array.isArray(data) ? data : [];
            let comentarioCompleto = comentario;
            if (source.length > 0) {
              const ultimoRegistro = source[0];
              const comentarioExistente = String(ultimoRegistro.Comentario || ultimoRegistro.comentario || '').trim();
              if (comentarioExistente) {
                comentarioCompleto = `${comentarioExistente} | SALIDA: ${comentario}`;
              } else {
                comentarioCompleto = `SALIDA: ${comentario}`;
              }
            } else {
              comentarioCompleto = `SALIDA: ${comentario}`;
            }
            
            await executeRegister('SALIDA', pendingSalidaCoords, pendingSalidaWarning, comentarioCompleto, imagenBase64, nombreImagen);
            setSalidaDialogVisible(false);
            setSalidaComentario('');
            setSalidaFoto(null);
            setPendingSalidaCoords(null);
            setPendingSalidaWarning('');
          } finally {
            setConfirmSalidaLoading(false);
          }
        };

        const handleCompareLocations = async () => {
          const okPerm = await requestLocationPermission();
          if (!okPerm) {
            setHasLocation(false);
            setMessage('Permiso de ubicación no otorgado. Active la ubicación para continuar.');
            return;
          }
          const enabled = await checkLocationEnabled();
          if (!enabled) {
            setMessage('La ubicación del dispositivo está desactivada. Active la ubicación para continuar.');
            return;
          }
          try {
            setLoadingCompareLocation(true);
            const refCoords = parseReferenceCoords(valorFin);
            if (!refCoords) {
              setMessage('No se pudo obtener un punto válido en ValorFin para comparar.');
              return;
            }
            const coords = await getCurrentPosition();
            if (!mounted.current) return;
            setCurrentCoords(coords);
            const distance = getDistanceToRequiredPoint(coords);
            if (distance === null) {
              setMessage('No se pudo calcular la distancia entre los puntos.');
              return;
            }
            const formattedDistance = `${distance.toFixed(2)} m`;
            if (distance <= MAX_DISTANCE_METERS) {
              setMessage(`Ubicación válida. Distancia al punto requerido: ${formattedDistance}.`);
            } else {
              setMessage(`La ubicación no es cercana al punto requerido. Distancia: ${formattedDistance}. Máximo permitido: ${MAX_DISTANCE_METERS} m.`);
            }
          } catch (e) {
            setMessage('No se pudo comparar la ubicación actual con ValorFin.');
          } finally {
            setLoadingCompareLocation(false);
          }
        };

        const closeLocationDialog = () => {
          setLocationDialogVisible(false);
        };

        const openCurrentLocationInMap = async () => {
          const okPerm = await requestLocationPermission();
          if (!okPerm) {
            setHasLocation(false);
            setMessage('Permiso de ubicación no otorgado. Active la ubicación para continuar.');
            return;
          }
          const enabled = await checkLocationEnabled();
          if (!enabled) {
            setMessage('La ubicación del dispositivo está desactivada. Active la ubicación para continuar.');
            return;
          }
          try {
            setLoadingCurrentLocation(true);
            const coords = await getCurrentPosition();
            const lat = coords?.latitude;
            const lon = coords?.longitude;
            if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
              setMessage('No hay coordenadas disponibles para abrir en mapa.');
              return;
            }
            const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            await Linking.openURL(url);
            setLocationDialogVisible(false);
          } catch (e) {
            setMessage('No se pudo abrir el mapa');
          } finally {
            setLoadingCurrentLocation(false);
          }
        };

        const renderRow = useCallback(({ item, index }) => {
          try {
            const uniqueId = String(item.IdAsistencia ?? item.Id ?? `${item.IdEmpleado ?? ''}_${item.FechaAsistencia ?? ''}_${item.Hora ?? item.hora ?? ''}`);
            const fecha = formatDateDayMonth(item.FechaAsistencia ?? item.fecha ?? item.Date ?? '');
            const hora = formatTime(item.Hora ?? item.hora ?? item.HoraCreacion ?? item.horaCreacion ?? '');
            const horaSalida = formatTime(item.HoraSalida ?? item.horaSalida ?? '');
            const tiempoTrabajado = formatTime(item.TiempoTrabajado ?? item.tiempoTrabajado ?? '');
            const latitudSalida = (item.LatitudSalida ?? item.latitudSalida ?? '').toString();
            const longitudSalida = (item.LongitudSalida ?? item.longitudSalida ?? '').toString();
            const estado = formatEstadoLabel(item.Estado ?? item.estado ?? '');
            return (
              <View>
                <View style={[styles.row, { backgroundColor: '#fff', minHeight: 20 }]}> 
                  <Text style={[styles.cell, styles.cellEstado, { color: '#000' }]}>{estado}</Text>
                  <Text style={[styles.cell, styles.cellFecha, { color: '#000' }]}>{fecha}</Text>
                  <Text style={[styles.cell, styles.cellHora, { color: '#000' }]}>{hora}</Text>
                  <View style={[styles.cell, styles.cellAccion]}> 
                    <IconButton
                      icon="magnify"
                      size={20}
                      onPress={async () => {
                        const lat = item.Latitud ?? item.lat ?? item.latitude ?? item.Lat ?? null;
                        const lon = item.Longitud ?? item.lon ?? item.longitude ?? item.Long ?? null;
                        if (!lat || !lon) {
                          setMessage('Ubicacion no encontrada');
                          return;
                        }
                        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
                        try {
                          await Linking.openURL(url);
                        } catch (e) {
                          setMessage('No se pudo abrir el mapa');
                        }
                      }}
                    />
                  </View>
                  <Text style={[styles.cell, styles.cellHoraSalida, { color: '#000' }]}>{horaSalida}</Text>
                  <View style={[styles.cell, styles.cellAccionSalida]}> 
                    <IconButton
                      icon="magnify"
                      size={20}
                      onPress={async () => {
                        const latSalida = item.LatitudSalida ?? item.latitudSalida ?? null;
                        const lonSalida = item.LongitudSalida ?? item.longitudSalida ?? null;
                        if (!latSalida || !lonSalida) {
                          setMessage('Ubicación de salida no encontrada');
                          return;
                        }
                        const url = `https://www.google.com/maps/search/?api=1&query=${latSalida},${lonSalida}`;
                        try {
                          await Linking.openURL(url);
                        } catch (e) {
                          setMessage('No se pudo abrir el mapa');
                        }
                      }}
                    />
                  </View>
                  <Text style={[styles.cell, styles.cellHoraSalida, { color: '#000' }]}>{tiempoTrabajado}</Text>
                </View>
              </View>
            );
          } catch (err) {
            console.error('renderRow error:', err);
            return null;
          }
        }, [setMessage]);

        const renderListHeader = useCallback(() => (
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.cellEstado]}>Estado</Text>
            <Text style={[styles.headerCell, styles.cellFecha]}>Fecha</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Ingreso</Text>
            <View style={[styles.headerCell, styles.cellAccion]}></View>
            <Text style={[styles.headerCell, styles.cellHoraSalida]}>Salida</Text>
            <View style={[styles.headerCell, styles.cellAccionSalida]}></View>
            <Text style={[styles.headerCell, styles.cellHoraSalida]}>Tiempo Trab.</Text>
          </View>
        ), []);

        const RenderRowMemo = renderRow;

        const totalRecords = useMemo(() => (Array.isArray(data) ? data.slice(0, pageSize) : []), [data]);
        const visibleData = totalRecords;
        const getResumenEstado = useCallback((item = {}) => {
          const estadoRaw = item.Estado ?? item.estado ?? '';
          const estadoTexto = String(estadoRaw ?? '').trim();
          return estadoTexto ? estadoTexto.toUpperCase() : 'SIN ESTADO';
        }, []);
        const resumenData = useMemo(() => {
          const source = Array.isArray(data) ? data : [];
          const conteoPorEstado = source.reduce((acc, item) => {
            const estado = getResumenEstado(item);
            acc[estado] = (acc[estado] || 0) + 1;
            return acc;
          }, {});
          return {
            total: source.length,
            estados: Object.entries(conteoPorEstado),
          };
        }, [data, getResumenEstado]);
        const maxResumenEstado = useMemo(() => {
          return resumenData.estados.reduce((max, [, cantidad]) => {
            const value = Number(cantidad) || 0;
            return value > max ? value : max;
          }, 0);
        }, [resumenData]);
        const filteredResumenRecords = useMemo(() => {
          const source = Array.isArray(data) ? data : [];
          if (!selectedResumenEstado) return [];
          if (selectedResumenEstado === '__ALL__') return source;
          return source.filter(item => {
            const estado = getResumenEstado(item);
            return estado === selectedResumenEstado;
          });
        }, [data, selectedResumenEstado, getResumenEstado]);
        const hasRegistroHoy = useMemo(() => {
          const source = Array.isArray(data) ? data : [];
          const nowLima = getLimaDate();
          const todayKey = `${nowLima.getFullYear()}-${String(nowLima.getMonth() + 1).padStart(2, '0')}-${String(nowLima.getDate()).padStart(2, '0')}`;

          const getLimaDateKey = (val) => {
            if (!val && val !== 0) return null;
            try {
              let d;
              if (val instanceof Date) d = val;
              else if (typeof val === 'number' || /^\d+$/.test(String(val))) d = new Date(Number(val));
              else d = new Date(val);
              if (isNaN(d.getTime())) return null;

              try {
                const limaStr = d.toLocaleString('en-US', { timeZone: 'America/Lima' });
                const limaDate = new Date(limaStr);
                if (!isNaN(limaDate.getTime())) d = limaDate;
              } catch (e) {
                // usa fecha ya parseada
              }

              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } catch (e) {
              return null;
            }
          };

          return source.some(item => {
            const dateVal = item.FechaAsistencia ?? item.fecha ?? item.Date ?? null;
            return getLimaDateKey(dateVal) === todayKey;
          });
        }, [data]);
        const barColors = useMemo(() => [
          MD3Colors.primary40,
          MD3Colors.secondary40,
          MD3Colors.tertiary40,
          MD3Colors.error40,
          MD3Colors.primary60,
          MD3Colors.secondary60,
        ], []);
        // remove fixed list height; use flex sizing so FlatList can scroll inside the Card

        const renderDebugItem = useCallback(({ item, index }) => (
          <Card style={{ marginBottom: 8 }}>
            <Card.Content>
              <Text style={{ fontWeight: '700' }}>#{index + 1} - {formatDateDayMonth(item.FechaAsistencia ?? item.fecha ?? '')} {formatTime(item.Hora ?? item.hora ?? '')}</Text>
              <Text>{`Estado: ${item.Estado ?? item.estado ?? ''}  Marcación: ${item.EstadoMarcacion ?? item.estadoMarcacion ?? ''}`}</Text>
              <Text>{`Ingreso: ${formatTime(item.Hora ?? item.hora ?? '')} | Salida: ${formatTime(item.HoraSalida ?? item.horaSalida ?? '')} | Tiempo Trabajado: ${formatTime(item.TiempoTrabajado ?? item.tiempoTrabajado ?? '')}`}</Text>
              <Text numberOfLines={2} ellipsizeMode="tail">{JSON.stringify(item)}</Text>
            </Card.Content>
          </Card>
        ), [formatDateDayMonth, formatTime]);

        return (
          <View style={styles.container}>
            <View style={styles.tabsRow}>
              <Button
                mode={activeTab === 'REGISTRO' ? 'contained' : 'outlined'}
                onPress={() => setActiveTab('REGISTRO')}
                style={styles.tabButton}
              >
                REGISTRO
              </Button>
              <Button
                mode={activeTab === 'RESUMEN' ? 'contained' : 'outlined'}
                onPress={() => {
                  setActiveTab('RESUMEN');
                  fetchData();
                }}
                style={styles.tabButton}
              >
                RESUMEN
              </Button>
            </View>

              {!hasLocation && (
                <Card style={{ marginBottom: 12, padding: 10, backgroundColor: '#fff3f3' }}>
                  <Card.Content>
                    <Text style={{ color: '#a00', fontWeight: '700' }}>Ubicación desactivada</Text>
                    <Text>Active la ubicación o permisos para registrar INGRESO/SALIDA.</Text>
                    <View style={{ marginTop: 8 }}>
                        <Button mode="outlined" onPress={() => openLocationSettings()}>
                          Abrir configuración
                        </Button>
                    </View>
                  </Card.Content>
                </Card>
              )}
              {activeTab === 'REGISTRO' && (
                <>
                  <Card style={styles.cardTime}>
                    <Card.Content style={styles.cardTimeContent}>
                      <Text style={styles.timeLabel}>Hora actual</Text>
                      <TimeClock />
                    </Card.Content>
                  </Card>
                  <View style={styles.buttonsRow}>
                    <Button mode="contained" buttonColor="#43A047" onPress={() => handleRegister('INGRESO')} style={styles.actionButton} loading={loading || registerActionRunning} disabled={loading || registerActionRunning}>
                      INGRESO
                    </Button>
                    {SHOW_SALIDA_BUTTON && (
                      <Button mode="contained" buttonColor="#FA8072" onPress={() => handleRegister('SALIDA')} style={styles.actionButton} loading={loading || registerActionRunning} disabled={loading || registerActionRunning}>
                        SALIDA
                      </Button>
                    )}
                  </View>
                  <Button
                    mode="outlined"
                    onPress={handleCompareLocations}
                    style={styles.compareButton}
                    loading={loadingCompareLocation}
                    disabled={loadingCompareLocation || !hasLocation}
                  >
                    COMPARAR UBICACIONES
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleViewCurrentLocation}
                    style={styles.locationButton}
                    loading={loadingCurrentLocation}
                    disabled={loadingCurrentLocation || !hasLocation}
                  >
                    VER UBICACIÓN ACTUAL
                  </Button>
                </>
              )}

            <Portal>
              <Dialog visible={locationDialogVisible} onDismiss={closeLocationDialog}>
                <Dialog.Title>Abrir ubicación actual</Dialog.Title>
                <Dialog.Content>
                  <Text>¿Desea visualizar su ubicación actual en Google Maps?</Text>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={closeLocationDialog}>No</Button>
                  <Button onPress={openCurrentLocationInMap} loading={loadingCurrentLocation} disabled={loadingCurrentLocation}>Sí, ver en mapa</Button>
                </Dialog.Actions>
              </Dialog>

              <Dialog visible={ingresoDialogVisible} onDismiss={closeIngresoDialog}>
                <Dialog.Title>Comentario de ingreso</Dialog.Title>
                <Dialog.Content>
                  <Text style={{ marginBottom: 8 }}>Ingrese el motivo del comentario (obligatorio):</Text>
                  <TextInput
                    mode="outlined"
                    value={ingresoComentario}
                    onChangeText={(value) => setIngresoComentario(String(value || '').slice(0, 250))}
                    maxLength={250}
                    multiline
                    numberOfLines={4}
                    placeholder="Escriba aquí el motivo..."
                    textColor="#231F36"
                    style={styles.ingresoCommentInput}
                  />
                  <Text style={{ marginTop: 6, textAlign: 'right', color: '#666' }}>
                    {(ingresoComentario || '').length}/250
                  </Text>
                  
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <Text style={{ marginBottom: 8, fontWeight: '600' }}>Foto de ingreso (obligatoria):</Text>
                    {ingresoFoto ? (
                      <View style={{ marginBottom: 8 }}>
                        <Image
                          source={{ uri: ingresoFoto.uri }}
                          style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 8 }}
                        />
                        <Text style={{ color: '#4CAF50', marginBottom: 8 }}>Foto cargada correctamente</Text>
                        <Button
                          mode="outlined"
                          onPress={() => setIngresoFoto(null)}
                          disabled={confirmIngresoLoading}
                          style={{ marginBottom: 8 }}
                        >
                          Cambiar foto
                        </Button>
                      </View>
                    ) : (
                      <View style={{ marginBottom: 8 }}>
                        <Button
                          mode="contained"
                          onPress={tomarFotoIngreso}
                          disabled={confirmIngresoLoading}
                          style={{ marginBottom: 8 }}
                        >
                          Tomar foto con camara
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={seleccionarImagenIngreso}
                          disabled={confirmIngresoLoading}
                        >
                          Cargar imagen de galeria
                        </Button>
                      </View>
                    )}
                  </View>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={closeIngresoDialog} disabled={confirmIngresoLoading}>Cancelar</Button>
                  <Button onPress={confirmIngresoRegister} loading={confirmIngresoLoading} disabled={confirmIngresoLoading || registerActionRunning || !ingresoFoto}>Aceptar</Button>
                </Dialog.Actions>
              </Dialog>

              <Dialog visible={salidaDialogVisible} onDismiss={closeSalidaDialog}>
                <Dialog.Title>Comentario de salida</Dialog.Title>
                <Dialog.Content>
                  <Text style={{ marginBottom: 8 }}>Ingrese el motivo del comentario (obligatorio):</Text>
                  <TextInput
                    mode="outlined"
                    value={salidaComentario}
                    onChangeText={(value) => setSalidaComentario(String(value || '').slice(0, 250))}
                    maxLength={250}
                    multiline
                    numberOfLines={4}
                    placeholder="Escriba aquí el motivo..."
                    textColor="#231F36"
                    style={styles.ingresoCommentInput}
                  />
                  <Text style={{ marginTop: 6, textAlign: 'right', color: '#666' }}>
                    {(salidaComentario || '').length}/250
                  </Text>
                  
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <Text style={{ marginBottom: 8, fontWeight: '600' }}>Foto de salida (obligatoria):</Text>
                    {salidaFoto ? (
                      <View style={{ marginBottom: 8 }}>
                        <Image
                          source={{ uri: salidaFoto.uri }}
                          style={{ width: '100%', height: 200, borderRadius: 8, marginBottom: 8 }}
                        />
                        <Text style={{ color: '#4CAF50', marginBottom: 8 }}>Foto cargada correctamente</Text>
                        <Button
                          mode="outlined"
                          onPress={() => setSalidaFoto(null)}
                          disabled={confirmSalidaLoading}
                          style={{ marginBottom: 8 }}
                        >
                          Cambiar foto
                        </Button>
                      </View>
                    ) : (
                      <View style={{ marginBottom: 8 }}>
                        <Button
                          mode="contained"
                          onPress={tomarFotoSalida}
                          disabled={confirmSalidaLoading}
                          style={{ marginBottom: 8 }}
                        >
                          Tomar foto con camara
                        </Button>
                        <Button
                          mode="outlined"
                          onPress={seleccionarImagenSalida}
                          disabled={confirmSalidaLoading}
                        >
                          Cargar imagen de galeria
                        </Button>
                      </View>
                    )}
                  </View>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={closeSalidaDialog} disabled={confirmSalidaLoading}>Cancelar</Button>
                  <Button onPress={confirmSalidaRegister} loading={confirmSalidaLoading} disabled={confirmSalidaLoading || registerActionRunning || !salidaFoto}>Aceptar</Button>
                </Dialog.Actions>
              </Dialog>

              <Snackbar
                visible={!!message}
                onDismiss={() => setMessage('')}
                duration={4500}
                wrapperStyle={styles.snackbarWrapper}
              >
                {message}
              </Snackbar>
            </Portal>

            {activeTab === 'REGISTRO' && null}

            {activeTab === 'RESUMEN' && (
              <Card style={styles.cardGrid}>
                <Card.Content>
                  <Pressable style={styles.summaryRow} onPress={() => setSelectedResumenEstado('__ALL__')}>
                    <Text style={styles.summaryLabel}>Total de registros</Text>
                    <Text style={styles.summaryValue}>{resumenData.total}</Text>
                  </Pressable>

                  <View style={styles.chartBox}>
                    {resumenData.estados.length === 0 && (
                      <Text style={styles.chartEmpty}>Sin datos para mostrar</Text>
                    )}
                    {resumenData.estados.map(([estado, cantidad], index) => {
                      const value = Number(cantidad) || 0;
                      const barWidth = maxResumenEstado > 0 ? `${(value / maxResumenEstado) * 100}%` : '0%';
                      const barColor = barColors[index % barColors.length];
                      const isSelected = selectedResumenEstado === estado;
                      return (
                        <Pressable
                          key={`bar_${estado}`}
                          style={[styles.barRow, isSelected && styles.barRowSelected]}
                          onPress={() => setSelectedResumenEstado(prev => (prev === estado ? null : estado))}
                        >
                          <Text style={styles.barLabel}>{estado}</Text>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]} />
                          </View>
                          <Text style={styles.barValue}>{value}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {selectedResumenEstado && (
                    <Text style={styles.filteredTitle}>
                      {selectedResumenEstado === '__ALL__'
                        ? 'Registros filtrados: TODOS'
                        : `Registros filtrados: ${selectedResumenEstado}`}
                    </Text>
                  )}
                  {!selectedResumenEstado && resumenData.estados.length > 0 && (
                    <Text style={styles.filteredHint}>Seleccione una barra para ver el detalle filtrado.</Text>
                  )}

                  {selectedResumenEstado && (
                    <ScrollView style={styles.filteredListWrapper} horizontal={true} showsHorizontalScrollIndicator={true} contentContainerStyle={styles.filteredListContent}>
                      <View style={styles.filteredListInner}>
                        <FlatList
                          data={filteredResumenRecords}
                          keyExtractor={item => String(item.IdAsistencia ?? item.Id ?? `${item.IdEmpleado ?? ''}_${item.FechaAsistencia ?? ''}_${item.Hora ?? item.hora ?? ''}`)}
                          style={styles.filteredList}
                          contentContainerStyle={{ paddingBottom: 16 }}
                          keyboardShouldPersistTaps="handled"
                          ListHeaderComponent={renderListHeader}
                          renderItem={RenderRowMemo}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                          persistentScrollbar={true}
                        />
                      </View>
                    </ScrollView>
                  )}
                </Card.Content>
              </Card>
            )}

          </View>
        );
      }

      const styles = StyleSheet.create({
        container: { flex: 1, padding: 16, backgroundColor: '#f4f6fa' },
        cardTime: { marginBottom: 12, paddingVertical: 16 },
        cardTimeContent: { alignItems: 'center', justifyContent: 'center', minHeight: 140 },
        timeLabel: { fontSize: 17, color: '#666', marginBottom: 10 },
        timeValue: { fontSize: 44, fontWeight: '700', color: '#231F36' },
        tabsRow: { flexDirection: 'row', marginBottom: 12 },
        tabButton: { flex: 1, marginHorizontal: 4 },
        buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
        actionButton: { flex: 1, marginHorizontal: 6, paddingVertical: 12 },
        valorFinText: { marginTop: -4, marginBottom: 8, marginHorizontal: 6, color: '#231F36', fontSize: 13, fontWeight: '700' },
        coordsText: { marginTop: 0, marginBottom: 4, marginHorizontal: 6, color: '#231F36', fontSize: 13 },
        compareButton: { marginBottom: 8 },
        deleteTestButton: { marginBottom: 8 },
        snackbarWrapper: { top: 16, zIndex: 9999, elevation: 9999 },
        locationButton: { marginBottom: 12 },
        ingresoCommentInput: { backgroundColor: '#fff' },
        cardGrid: { flex: 1, marginTop: 8, minHeight: 720, paddingVertical: 8 },
        chartBox: { marginBottom: 12, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, backgroundColor: '#fff' },
        chartTitle: { fontSize: 16, fontWeight: '700', color: '#231F36', marginBottom: 10 },
        chartEmpty: { fontSize: 14, color: '#666' },
        barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 },
        barRowSelected: { borderColor: '#231F36', backgroundColor: '#f5f5f8' },
        barLabel: { width: 95, fontSize: 13, color: '#333' },
        barTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: '#eee', overflow: 'hidden' },
        barFill: { height: '100%', borderRadius: 7, backgroundColor: '#231F36' },
        barValue: { width: 34, textAlign: 'right', fontSize: 13, color: '#231F36', fontWeight: '700', marginLeft: 8 },
        summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
        summaryLabel: { fontSize: 16, color: '#333' },
        summaryValue: { fontSize: 16, fontWeight: '700', color: '#231F36' },
        filteredTitle: { fontSize: 14, fontWeight: '700', color: '#231F36', marginTop: 10, marginBottom: 8 },
        filteredHint: { fontSize: 13, color: '#666', marginTop: 10, marginBottom: 8 },
        filteredListWrapper: { width: '100%', backgroundColor: '#fff', borderRadius: 4 },
        filteredListContent: { flexGrow: 1 },
        filteredListInner: { minWidth: 550, minHeight: 180, maxHeight: 280, paddingRight: 8 },
        filteredList: { width: '100%' },
        row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, borderBottomWidth: 1, borderColor: '#eee' },
        cell: { paddingHorizontal: 4, flexShrink: 0, fontSize: 12 },
        cellFecha: { minWidth: 58 },
        cellEstado: { minWidth: 96 },
        cellIdEstado: { minWidth: 82 },
        cellEstadoMarcacion: { minWidth: 140 },
        cellHora: { minWidth: 82 },
        cellHoraSalida: { minWidth: 82 },
        cellLatitudSalida: { minWidth: 88 },
        cellLongitudSalida: { minWidth: 88 },
        cellAccion: { width: 20, alignItems: 'center', justifyContent: 'center' },
        cellAccionSalida: { width: 20, alignItems: 'center', justifyContent: 'center' },
        headerRow: { flexDirection: 'row', paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' },
        headerCell: { paddingHorizontal: 8, fontWeight: '700', flexShrink: 0 },
        detalleCard: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: '#eee' },
        cellLabel: { fontSize: 13, fontWeight: '700', color: '#444', marginRight: 6 },
      });

      function TimeClock() {
        const [t, setT] = React.useState(getLimaDate());
        React.useEffect(() => {
          let mounted = true;
          const tick = () => setT(getLimaDate());
          tick();
          const id = setInterval(() => {
            if (mounted) tick();
          }, 1000);
          return () => {
            mounted = false;
            clearInterval(id);
          };
        }, []);
        const hh = String(t.getHours()).padStart(2, '0');
        const mm = String(t.getMinutes()).padStart(2, '0');
        const ss = String(t.getSeconds()).padStart(2, '0');
        return <RNText style={styles.timeValue}>{`${hh}:${mm}:${ss}`}</RNText>;
      }

