import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Platform, Linking, ScrollView, Pressable, Text as RNText } from 'react-native';
import { Text, Button, IconButton, Card, DataTable, Snackbar, Portal, Dialog, Paragraph, MD3Colors } from 'react-native-paper';
import { UserContext } from '../context/UserContext';
import { getAsistencia, registerAsistencia } from '../api/asistencia';
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
  const SHOW_SALIDA_BUTTON = false;
  const { codEmp, idusuario, cuadrilla } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState('REGISTRO');
  const [selectedResumenEstado, setSelectedResumenEstado] = useState(null);
  // avoid logging before state initialization
  // time moved to TimeClock component to avoid re-rendering this screen every second
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [apiDebug, setApiDebug] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [locationDialogVisible, setLocationDialogVisible] = useState(false);
  const [pendingTipo, setPendingTipo] = useState(null);
  const [pendingCoords, setPendingCoords] = useState(null);
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  const [hasLocation, setHasLocation] = useState(true);
  const MIN_ACCURACY = 100; // metros
  const pageSize = 31; // show up to 31 records in one page by default
  //const [pendingCoords, setPendingCoords] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    // removed verbose debug logging to keep console clean
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

        useEffect(() => {
          mounted.current = true;
          // Comprobar estado de ubicación al montar
          checkLocationEnabled();
          fetchData();
          return () => {
            mounted.current = false;
          };
        }, []);

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
          const res = await getAsistencia({ codEmp: idEmpleado });
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

        const handleRegister = async (tipo) => {
          // Verificar permiso y estado de ubicación
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
            const coords = await getCurrentPosition();
            setPendingCoords(coords);
            setPendingTipo(tipo);
            setDialogVisible(true);
          } catch (err) {
            setMessage('No se puede obtener la ubicación. Active la ubicación del dispositivo.');
          }
        };

        const confirmRegister = async () => {
          const tipo = pendingTipo;
          const coords = pendingCoords;
          setDialogVisible(false);
          setPendingTipo(null);
          setPendingCoords(null);
          setLoading(true);
          const idEmpleado = cuadrilla || codEmp || idusuario;
          const res = await registerAsistencia({ codEmp: idEmpleado, tipo, lat: coords?.latitude, lon: coords?.longitude });
          setLoading(false);
          if (res && !res.error) {
            setMessage(`${tipo} registrado correctamente`);
            fetchData();
          } else {
            setMessage(res.message || 'Error al registrar');
          }
        };

        const cancelDialog = () => {
          setDialogVisible(false);
          setPendingTipo(null);
        };

        const handleViewCurrentLocation = () => {
          setLocationDialogVisible(true);
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
            const estado = item.Estado ?? item.estado ?? item.EstadoMarcacion ?? item.estadoMarcacion ?? item.IdEstado ?? item.idEstado ?? '';
            const hora = formatTime(item.Hora ?? item.hora ?? item.HoraCreacion ?? item.horaCreacion ?? '');
            const estadoMarcacion = item.EstadoMarcacion ?? item.estadoMarcacion ?? '';
            return (
              <View>
                <View style={[styles.row, { backgroundColor: '#fff', minHeight: 20 }]}> 
                  <Text style={[styles.cell, styles.cellFecha, { color: '#000' }]}>{fecha}</Text>
                  <Text style={[styles.cell, styles.cellHora, { color: '#000' }]}>{hora}</Text>
                  <Text style={[styles.cell, styles.cellEstado, { color: '#000' }]}>{estado}</Text>
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
            <Text style={[styles.headerCell, styles.cellFecha]}>Fecha</Text>
            <Text style={[styles.headerCell, styles.cellHora]}>Hora</Text>
            <Text style={[styles.headerCell, styles.cellEstado]}>Estado</Text>
            <Text style={[styles.headerCell, styles.cellAccion]}></Text>
          </View>
        ), []);

        const RenderRowMemo = renderRow;

        const totalRecords = useMemo(() => (Array.isArray(data) ? data.slice(0, pageSize) : []), [data]);
        const visibleData = totalRecords;
        const resumenData = useMemo(() => {
          const source = Array.isArray(data) ? data : [];
          const conteoPorEstado = source.reduce((acc, item) => {
            const estado = String(item.Estado ?? item.estado ?? 'SIN ESTADO').trim() || 'SIN ESTADO';
            acc[estado] = (acc[estado] || 0) + 1;
            return acc;
          }, {});
          return {
            total: source.length,
            estados: Object.entries(conteoPorEstado),
          };
        }, [data]);
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
            const estado = String(item.Estado ?? item.estado ?? 'SIN ESTADO').trim() || 'SIN ESTADO';
            return estado === selectedResumenEstado;
          });
        }, [data, selectedResumenEstado]);
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
                onPress={() => setActiveTab('RESUMEN')}
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
                    <Button mode="contained" buttonColor="#43A047" onPress={() => handleRegister('INGRESO')} style={styles.actionButton} loading={loading} disabled={loading || !hasLocation || hasRegistroHoy}>
                      INGRESO
                    </Button>
                    {SHOW_SALIDA_BUTTON && (
                      <Button mode="contained" onPress={() => handleRegister('SALIDA')} style={styles.actionButton} loading={loading} disabled={loading || !hasLocation}>
                        SALIDA
                      </Button>
                    )}
                  </View>
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
              <Dialog visible={dialogVisible} onDismiss={cancelDialog}>
                <Dialog.Title>Confirmar</Dialog.Title>
                <Dialog.Content>
                  <Paragraph>¿Desea registrar "{pendingTipo}" en asistencia?</Paragraph>
                  {pendingCoords && (
                    <View style={{ marginTop: 8 }}>
                      <Text>Lat: {pendingCoords.latitude?.toFixed(6)}</Text>
                      <Text>Lon: {pendingCoords.longitude?.toFixed(6)}</Text>
                      <Text>Precisión: {pendingCoords.accuracy ? `${pendingCoords.accuracy} m` : 'N/A'}</Text>
                      {pendingCoords.accuracy && pendingCoords.accuracy > MIN_ACCURACY && (
                        <Text style={{ color: '#a00', marginTop: 6 }}>Precisión insuficiente. Necesaria ≤ {MIN_ACCURACY} m</Text>
                      )}
                    </View>
                  )}
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={cancelDialog}>Cancelar</Button>
                  <Button onPress={confirmRegister} disabled={pendingCoords && pendingCoords.accuracy && pendingCoords.accuracy > MIN_ACCURACY}>
                    Confirmar
                  </Button>
                </Dialog.Actions>
              </Dialog>

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
        buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
        actionButton: { flex: 1, marginHorizontal: 6, paddingVertical: 12 },
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
        cellHora: { minWidth: 82 },
        cellAccion: { width: 56, alignItems: 'center' },
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
