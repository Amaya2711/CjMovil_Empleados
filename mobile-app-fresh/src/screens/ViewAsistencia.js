import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Platform, Linking, ScrollView, Pressable, Text as RNText } from 'react-native';
import { Text, Button, IconButton, Card, DataTable, Snackbar, Portal, Dialog, MD3Colors } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { getAsistencia, getConstanteOficinas, registerAsistencia, validarListadoDiario } from '../api/asistencia';
import * as Location from 'expo-location';
import { useCallback, useMemo } from 'react';

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
  const [registeringTipo, setRegisteringTipo] = useState(null);
  const [pressedTipo, setPressedTipo] = useState(null);
  const [apiDebug, setApiDebug] = useState(null);
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  const [loadingCompareLocation, setLoadingCompareLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(true);
  const [idEstadoDiario, setIdEstadoDiario] = useState(null);
  const [valorFin, setValorFin] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
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
            // If already in HH:mm:ss or HH:mm:ss.SSS format, return HH:mm:ss
            if (typeof val === 'string' && /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(val)) {
              return val.split('.')[0];
            }
            let d;
            if (val instanceof Date) d = val;
            else if (typeof val === 'number' || /^\d+$/.test(String(val))) d = new Date(Number(val));
            else d = new Date(val);
            if (isNaN(d.getTime())) return String(val);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${hh}:${mm}:${ss}`;
          } catch (e) {
            return String(val);
          }
        };

        const formatTimeLima = (val) => {
          if (!val && val !== 0) return '';
          try {
            if (typeof val === 'string' && /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(val)) {
              return val.split('.')[0];
            }

            let d;
            if (val instanceof Date) d = val;
            else if (typeof val === 'number' || /^\d+$/.test(String(val))) d = new Date(Number(val));
            else d = new Date(val);
            if (isNaN(d.getTime())) return String(val);

            try {
              const formatter = new Intl.DateTimeFormat('es-PE', {
                timeZone: 'America/Lima',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });
              return formatter.format(d);
            } catch (e) {
              const utc = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
              const lima = new Date(utc.getTime() - 5 * 60 * 60000);
              const hh = String(lima.getHours()).padStart(2, '0');
              const mm = String(lima.getMinutes()).padStart(2, '0');
              const ss = String(lima.getSeconds()).padStart(2, '0');
              return `${hh}:${mm}:${ss}`;
            }
          } catch (e) {
            return String(val);
          }
        };

        const formatEstadoLabel = (val) => {
          const raw = val === null || typeof val === 'undefined' ? '' : String(val).trim();
          if (!raw) return 'SIN ESTADO';
          if (raw === '0') return 'NO LLENADO';
          return raw;
        };

        const isEstadoFueraRango = (item = {}) => {
          const estadoMarcacionValue =
            item.EstadoMarcacion ??
            item.estadoMarcacion ??
            item.Estado_Marcacion ??
            item.estado_marcacion ??
            null;
          const estadoSalidaValue =
            item.EstadoSalida ??
            item.estadoSalida ??
            item.EstadoSalda ??
            item.estadoSalda ??
            item.Estado_Salida ??
            item.estado_salida ??
            null;

          const estadoMarcacion = estadoMarcacionValue === null || typeof estadoMarcacionValue === 'undefined'
            ? ''
            : String(estadoMarcacionValue).trim();
          const estadoSalida = estadoSalidaValue === null || typeof estadoSalidaValue === 'undefined'
            ? ''
            : String(estadoSalidaValue).trim();

          return estadoMarcacion === '9' || estadoSalida === '9';
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
          // response logged only when needed
          if (!mounted.current) return;
          // Manejo explícito y logging para depuración
          if (!res) {
            setMessage('Respuesta vacía del servidor');
            setData([]);
            setApiDebug('null');
          } else if (res.error) {
            setMessage(res.message || 'Error al obtener datos');
            setData([]);
            setApiDebug(JSON.stringify(res));
          } else if (Array.isArray(res)) {
            setData(res);
            setApiDebug(`array:${res.length}`);
          } else if (res.data && Array.isArray(res.data)) {
            setData(res.data);
            setApiDebug(`payload.data:${res.data.length}`);
          } else {
            // Respuesta inesperada
            setData([]);
            setApiDebug(JSON.stringify(res));
            setMessage('Respuesta inesperada del servidor');
          }
          setLoading(false);
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
          if (registeringTipo || loading) return;
          setRegisteringTipo(tipo);
          if (tipo === 'SALIDA') {
            console.log('[SALIDA][CLICK] Botón SALIDA presionado');
          }
          try {
            const source = Array.isArray(data) ? data : [];
            const currentUserValue = cuadrilla ?? codEmp ?? idusuario ?? null;
            const currentUserKey = currentUserValue === null || typeof currentUserValue === 'undefined'
              ? ''
              : String(currentUserValue).trim();
            const nowLima = getLimaDate();
            const todayKey = `${nowLima.getFullYear()}-${String(nowLima.getMonth() + 1).padStart(2, '0')}-${String(nowLima.getDate()).padStart(2, '0')}`;
            const SENTINEL_HORA_VALUES = new Set([
              '1900-01-01 00:00:00:000',
              '1900-01-01 00:00:00.000',
              '1900-01-01T00:00:00.000',
              '1900-01-01T00:00:00.000Z',
            ]);
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
                }
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              } catch (e) {
                return null;
              }
            };

            const getUserKey = (item) => {
              const userValue =
                item.IdEmpleado ??
                item.idEmpleado ??
                item.CodEmp ??
                item.codEmp ??
                item.UsuarioAct ??
                item.usuarioAct ??
                null;
              if (userValue === null || typeof userValue === 'undefined') return '';
              return String(userValue).trim();
            };

            if (tipo === 'INGRESO') {

              const existeRegistroHoyConHora = source.some(item => {
                const dateVal = item.FechaAsistencia ?? item.fecha ?? item.Date ?? null;
                const horaVal = item.Hora ?? item.hora ?? item.HoraCreacion ?? item.horaCreacion ?? null;
                const horaTexto = horaVal === null || typeof horaVal === 'undefined' ? '' : String(horaVal).trim();
                const itemUserKey = getUserKey(item);
                const sameDay = getLimaDateKey(dateVal) === todayKey;
                const sameUser = currentUserKey !== '' && itemUserKey !== '' && itemUserKey === currentUserKey;
                const horaAsignada = horaTexto !== '' && !SENTINEL_HORA_VALUES.has(horaTexto);
                return sameDay && sameUser && horaAsignada;
              });

              if (existeRegistroHoyConHora) {
                setMessage('Ya existe un registro del día para este usuario con Hora asignada. No se puede registrar INGRESO nuevamente.');
                return;
              }
            }

            if (tipo === 'SALIDA') {
              const existeRegistroHoyConHoraSalida = source.some(item => {
                const dateVal = item.FechaAsistencia ?? item.fecha ?? item.Date ?? null;
                const horaSalidaVal =
                  item.HoraSalida ??
                  item.horaSalida ??
                  item.Hora_Salida ??
                  item.hora_salida ??
                  item.HoraSalidaMarcacion ??
                  item.horaSalidaMarcacion ??
                  item.HoraSalidaRegistro ??
                  item.horaSalidaRegistro ??
                  null;
                const horaSalidaTexto = horaSalidaVal === null || typeof horaSalidaVal === 'undefined' ? '' : String(horaSalidaVal).trim();
                const itemUserKey = getUserKey(item);
                const sameDay = getLimaDateKey(dateVal) === todayKey;
                const sameUser = currentUserKey !== '' && itemUserKey !== '' && itemUserKey === currentUserKey;
                const horaSalidaAsignada = horaSalidaTexto !== '' && !SENTINEL_HORA_VALUES.has(horaSalidaTexto);
                return sameDay && sameUser && horaSalidaAsignada;
              });

              if (existeRegistroHoyConHoraSalida) {
                setMessage('Ya existe un registro del día para este usuario con Hora de salida asignada. No se puede registrar SALIDA nuevamente.');
                return;
              }
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
            const outOfRange = distance !== null && distance > MAX_DISTANCE_METERS;
            await executeRegister(tipo, coords, warningMessage, outOfRange);
          } catch (err) {
            setMessage(LOCATION_REQUIRED_MESSAGE);
          } finally {
            setRegisteringTipo(null);
            setPressedTipo(null);
          }
        };

        const executeRegister = async (tipo, coords, warningMessage = '', outOfRange = false) => {
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
          const res = await registerAsistencia({ usuarioAct, codEmp, tipo, lat: coords?.latitude, lon: coords?.longitude, fechaAsistencia, outOfRange });
          setLoading(false);
          if (res && !res.error) {
            setMessage(warningMessage ? `${warningMessage} ${tipo} registrado correctamente.` : `${tipo} registrado correctamente`);
            setActiveTab('RESUMEN');
            setSelectedResumenEstado('__ALL__');
            await fetchData();
          } else {
            setMessage(res.message || 'Error al registrar');
          }
        };

        const handleViewCurrentLocation = () => {
          setLocationDialogVisible(true);
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
            if (!lat || !lon) {
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
            const estado = formatEstadoLabel(item.Estado ?? item.estado ?? '');
            const highlighted = isEstadoFueraRango(item);
            return (
              <View>
                <View style={[styles.row, { backgroundColor: highlighted ? '#ffd9d2' : '#fff', minHeight: 20 }]}> 
                  <Text style={[styles.cell, styles.cellEstado, { color: '#000' }]}>{estado}</Text>
                  <Text style={[styles.cell, styles.cellFecha, { color: '#000' }]}>{fecha}</Text>
                  <Text style={[styles.cell, styles.cellHora, { color: '#000' }]}>{hora}</Text>
                  <View style={[styles.cell, styles.cellAccionTight]}>
                    <IconButton
                      icon="magnify"
                      size={16}
                      style={styles.iconButtonCompact}
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
            <Text style={[styles.headerCell, styles.cellHora]}>Hora</Text>
            <Text style={[styles.headerCell, styles.cellAccion]}></Text>
          </View>
        ), []);

        const renderFilteredRow = useCallback(({ item }) => {
          try {
            const fecha = formatDateDayMonth(item.FechaAsistencia ?? item.fecha ?? item.Date ?? '');
            const hora = formatTimeLima(item.Hora ?? item.hora ?? item.HoraCreacion ?? item.horaCreacion ?? '');
            const horaSalidaRaw =
              item.HoraSalida ??
              item.horaSalida ??
              item.Hora_Salida ??
              item.hora_salida ??
              item.HoraSalidaMarcacion ??
              item.horaSalidaMarcacion ??
              item.HoraSalidaRegistro ??
              item.horaSalidaRegistro ??
              item.HoraFin ??
              item.horaFin ??
              '';
            const horaSalida = horaSalidaRaw ? formatTimeLima(horaSalidaRaw) : '--';
            const estado = formatEstadoLabel(item.Estado ?? item.estado ?? '');
            const highlighted = isEstadoFueraRango(item);
            return (
              <View>
                <View style={[styles.row, { backgroundColor: highlighted ? '#ffd9d2' : '#fff', minHeight: 20 }]}> 
                  <Text style={[styles.cell, styles.cellFecha, { color: '#000' }]}>{fecha}</Text>
                  <Text style={[styles.cell, styles.cellHora, { color: '#000' }]}>{hora}</Text>
                  <View style={[styles.cell, styles.cellAccion]}>
                    <IconButton
                      icon="magnify"
                      size={16}
                      style={styles.iconButtonCompact}
                      onPress={async () => {
                        const latEntrada = item.Latitud ?? item.latitud ?? item.latitude ?? item.Lat ?? null;
                        const lonEntrada = item.Longitud ?? item.longitud ?? item.longitude ?? item.Long ?? null;
                        if (!latEntrada || !lonEntrada) {
                          setMessage('Coordenadas de entrada no encontradas');
                          return;
                        }
                        const url = `https://www.google.com/maps/search/?api=1&query=${latEntrada},${lonEntrada}`;
                        try {
                          await Linking.openURL(url);
                        } catch (e) {
                          setMessage('No se pudo abrir el mapa');
                        }
                      }}
                    />
                  </View>
                  <Text style={[styles.cell, styles.cellHoraSalida, { color: '#000' }]}>{horaSalida}</Text>
                  <View style={[styles.cell, styles.cellAccion]}>
                    <IconButton
                      icon="magnify"
                      size={16}
                      style={styles.iconButtonCompact}
                      onPress={async () => {
                        const latSalida = item.LatitudSalida ?? item.latitudSalida ?? item.latitudsalida ?? item.Latitud_Salida ?? null;
                        const lonSalida = item.LongitudSalida ?? item.longitudSalida ?? item.longitudsalida ?? item.Longitud_Salida ?? null;
                        if (!latSalida || !lonSalida) {
                          setMessage('Coordenadas de salida no encontradas');
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
                  <Text style={[styles.cell, styles.cellEstado, { color: '#000' }]}>{estado}</Text>
                </View>
              </View>
            );
          } catch (err) {
            console.error('renderFilteredRow error:', err);
            return null;
          }
        }, [setMessage]);

        const renderFilteredListHeader = useCallback(() => (
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.cellFecha]}>Fecha</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Hora</Text>
            <Text style={[styles.headerCell, styles.cellAccion]}></Text>
            <Text style={[styles.headerCell, styles.cellHoraSalida]}>Salida</Text>
            <Text style={[styles.headerCell, styles.cellAccion]}></Text>
            <Text style={[styles.headerCell, styles.cellEstado]}>Estado</Text>
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
                    <Button
                      mode="contained"
                      buttonColor="#43A047"
                      onPress={() => handleRegister('INGRESO')}
                      onPressIn={() => setPressedTipo('INGRESO')}
                      onPressOut={() => setPressedTipo(null)}
                      style={[styles.actionButton, (pressedTipo === 'INGRESO' || registeringTipo === 'INGRESO') && styles.actionButtonPressed]}
                      loading={registeringTipo === 'INGRESO'}
                      disabled={!!registeringTipo || loading}
                    >
                      INGRESO
                    </Button>
                    {SHOW_SALIDA_BUTTON && (
                      <Button
                        mode="contained"
                        buttonColor="#FA8072"
                        onPress={() => handleRegister('SALIDA')}
                        onPressIn={() => setPressedTipo('SALIDA')}
                        onPressOut={() => setPressedTipo(null)}
                        style={[styles.actionButton, (pressedTipo === 'SALIDA' || registeringTipo === 'SALIDA') && styles.actionButtonPressed]}
                        loading={registeringTipo === 'SALIDA'}
                        disabled={!!registeringTipo || loading}
                      >
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
                          ListHeaderComponent={renderFilteredListHeader}
                          renderItem={renderFilteredRow}
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

            <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={3000}>
              {message}
            </Snackbar>
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
        buttonsRow: { marginBottom: 12 },
        actionButton: { width: '100%', marginBottom: 10, paddingVertical: 12 },
        actionButtonPressed: { opacity: 0.75 },
        valorFinText: { marginTop: -4, marginBottom: 8, marginHorizontal: 6, color: '#231F36', fontSize: 13, fontWeight: '700' },
        coordsText: { marginTop: 0, marginBottom: 4, marginHorizontal: 6, color: '#231F36', fontSize: 13 },
        compareButton: { marginBottom: 8 },
        deleteTestButton: { marginBottom: 8 },
        locationButton: { marginBottom: 12 },
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
        filteredListWrapper: { width: '100%' },
        filteredListContent: { flexGrow: 1 },
        filteredListInner: { width: '100%', minHeight: 180, maxHeight: 280 },
        filteredList: { width: '100%' },
        row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, borderBottomWidth: 1, borderColor: '#eee' },
        cell: { paddingHorizontal: 8, flexShrink: 0, fontSize: 12 },
        cellFecha: { minWidth: 58 },
        cellEstado: { minWidth: 96 },
        cellIdEstado: { minWidth: 82 },
        cellEstadoMarcacion: { minWidth: 140 },
        cellHora: { minWidth: 82 },
        cellHoraSalida: { minWidth: 62, textAlign: 'left', paddingHorizontal: 4 },
        cellAccion: { width: 22, alignItems: 'center', paddingHorizontal: 0 },
        cellAccionTight: { width: 18, alignItems: 'center', paddingHorizontal: 0 },
        iconButtonCompact: { margin: 0, width: 18, height: 18 },
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
