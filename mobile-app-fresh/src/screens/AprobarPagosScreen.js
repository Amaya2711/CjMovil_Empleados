// ...existing code...
import React, { useState, useEffect, useContext } from 'react';
import { Modal, Portal, Provider, Snackbar, ActivityIndicator } from 'react-native-paper';
import { getDatosOc } from '../api/datosOc';
import { aprobarPlanilla } from '../api/aprobarPlanilla';
import { UserContext } from '../context/UserContext';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Checkbox, Button } from 'react-native-paper';
import { getAprobaciones } from '../api/aprobaciones';
import { getSolicitantes } from '../api/solicitantes';
import { TextInput, List } from 'react-native-paper';

export default function AprobarPagosScreen() {
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmParams, setConfirmParams] = useState([]);
  const [accionActual, setAccionActual] = useState(''); // 'aprobar' | 'rechazar' | 'observar'
  const [observacionInput, setObservacionInput] = useState('');
  const [rechazoConfirmVisible, setRechazoConfirmVisible] = useState(false);
  const [observarConfirmVisible, setObservarConfirmVisible] = useState(false);
  const [sqlDebugModalVisible, setSqlDebugModalVisible] = useState(false);
  const [sqlDebugs, setSqlDebugs] = useState([]);
  const { ipLocal, CodVal } = useContext(UserContext);
  const [showCodVal, setShowCodVal] = useState(false);
  console.log('AprobarPagosScreen montado');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [resultadosOriginales, setResultadosOriginales] = useState([]); // datos originales
  const [seleccionados, setSeleccionados] = useState([]); // array de ids seleccionados
  const [expandido, setExpandido] = useState({}); // control de expansión por registro
  // Paginación para Resultados
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [tab, setTab] = useState('todos'); // 'todos' | 'seleccionados'
  const [modalVisible, setModalVisible] = useState(false);
  const [datosOc, setDatosOc] = useState(null);
  const [paramsOc, setParamsOc] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [loadingDatosOc, setLoadingDatosOc] = useState(false);
  const [solicitantes, setSolicitantes] = useState([]);

  // Función ultra segura para mostrar texto en <Text>
  const asText = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map(asText).join(', ');
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch {
        return '[objeto]';
      }
    }
    return String(v);
  };

  // Debug seguro para snackbarMsg
  useEffect(() => {
    if (typeof snackbarMsg !== 'string') {
      console.warn('snackbarMsg no string:', snackbarMsg);
    }
  }, [snackbarMsg]);

  // DEBUG: Detectar claves duplicadas en combinación de 'Corre' e 'IdSite'
  useEffect(() => {
    if (Array.isArray(resultados) && resultados.length > 0) {
      const comboCount = {};
      const comboItems = {};
      resultados.forEach(item => {
        const combo = `${String(item.Corre)}_${String(item.IdSite)}`;
        comboCount[combo] = (comboCount[combo] || 0) + 1;
        if (!comboItems[combo]) comboItems[combo] = [];
        comboItems[combo].push(item);
      });
      const duplicados = Object.entries(comboCount).filter(([k, v]) => v > 1);
      if (duplicados.length > 0) {
        console.warn('Registros con la misma llave (Corre + IdSite):');
        let mensaje = 'Duplicados Corre-IdSite: ';
        duplicados.forEach(([combo]) => {
          const items = comboItems[combo];
          items.forEach(item => {
            console.warn(`Corre: ${item.Corre}, IdSite: ${item.IdSite}`);
            mensaje += `[${item.Corre},${item.IdSite}] `;
          });
        });
        // Ya no se muestra el mensaje de duplicados automáticamente en el Snackbar
      }
    }
  }, [resultados]);

  // DEBUG: Detectar claves duplicadas en resultados
  useEffect(() => {
    if (Array.isArray(resultados) && resultados.length > 0) {
      const keyCount = {};
      resultados.forEach((item, index) => {
        const key = String(item.IdAprobacion || item.Id || `${item.FecIngreso}_${item.Solicitante}_${item.Total}_${index}`);
        keyCount[key] = (keyCount[key] || 0) + 1;
      });
      const duplicados = Object.entries(keyCount).filter(([k, v]) => v > 1);
      if (duplicados.length > 0) {
        console.warn('Claves duplicadas detectadas en resultados:', duplicados.map(([k, v]) => ({ key: k, repeticiones: v })));
      }
    }
  }, [resultados]);

  useEffect(() => {
    // Al cargar la pantalla, consultar el backend y solicitantes
    cargarAprobaciones();
    // Cargar todos los solicitantes al inicio (sin filtro)
    cargarSolicitantes('');
  }, []);

  // Recargar consulta general cada vez que cambia el check 'Todos'
  useEffect(() => {
    cargarAprobaciones();
  }, [showCodVal]);

  const cargarSolicitantes = async (nombre = '') => {
    try {
      const data = await getSolicitantes(nombre);
      setSolicitantes(data);
    } catch (error) {
      setSolicitantes([]);
    }
  };

  const cargarAprobaciones = async () => {
    try {
      // Si showCodVal es falso y CodVal tiene valor, enviar como IdValidador
      let data;
      if (!showCodVal && CodVal) {
        data = await getAprobaciones('', CodVal); // Nuevo segundo parámetro
      } else {
        data = await getAprobaciones();
      }
      setResultados(data);
      setResultadosOriginales(data);
    } catch (error) {
      setResultados([]);
      setResultadosOriginales([]);
    }
    setSeleccionados([]);
  };

  const buscar = async () => {
    // Limpiar resultados antes de buscar
    setResultados([]);
    setResultadosOriginales([]);
    setSeleccionados([]);
    // Buscar el solicitante seleccionado
    const seleccionado = solicitantes.find(s => String(s.NombreEmpleado) === filtroSolicitante);
    let idSolicitante = 0;
    if (seleccionado && seleccionado.IdEmpleado) {
      idSolicitante = seleccionado.IdEmpleado;
    } else {
      Alert.alert(
        'Aviso',
        'Solicitante no existe, mostrando todos los datos',
        [{ text: 'OK' }]
      );
    }
    try {
      const aprobaciones = await getAprobaciones(idSolicitante); // 0 muestra todos los datos
      setResultados(Array.isArray(aprobaciones) ? aprobaciones : []);
      setResultadosOriginales(Array.isArray(aprobaciones) ? aprobaciones : []);
    } catch (error) {
      setResultados([]);
      setResultadosOriginales([]);
    }
    // ...los resultados en pantalla siempre serán los obtenidos en la búsqueda
  };

  // ...existing code...

  // Utilidad para extraer solo el valor numérico de un string
  const getNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const match = val.match(/[-+]?[0-9]*\.?[0-9]+/);
      return match ? Number(match[0]) : 0;
    }
    return 0;
  };

  // Función utilitaria para obtener los parámetros para getDatosOc de un registro
  // Devuelve los parámetros con los nombres exactos que espera el backend
  const getDatosOcParams = (registro) => {
    // Extraer idoc
    const idoc = getNumber(registro?.idoc);
    // Extraer fila (si es array, tomar el primer valor)
    let fila = registro?.fila;
    if (Array.isArray(fila)) fila = fila[0];
    fila = getNumber(fila);
    // Extraer IdSite y Tipo_Trabajo
    const IdSite = registro?.IdSite ? registro.IdSite.toString() : '';
    const Tipo_Trabajo = registro?.Tipo_Trabajo ? registro.Tipo_Trabajo.toString() : '';
    return { idoc, fila, IdSite, Tipo_Trabajo };
  };

  const toggleSeleccion = async (id) => {
    console.log('toggleSeleccion INICIO:', { id });
    const registro = resultados.find(item => String(item.Corre) === String(id));
    // Determinar si ya está seleccionado
    let yaSeleccionado = false;
    setSeleccionados(prev => {
      yaSeleccionado = prev.includes(id);
      return yaSeleccionado ? prev.filter(sid => sid !== id) : [...prev, id];
    });
    // Solo mostrar modal si se está seleccionando (no desmarcando)
    if (!yaSeleccionado && registro) {
      let monto = 0;
      let moneda = '';
      if (registro.Subtotal !== undefined && !isNaN(Number(registro.Subtotal))) {
        monto = Number(registro.Subtotal);
      } else if (registro.Total !== undefined && !isNaN(Number(registro.Total))) {
        monto = Number(registro.Total);
      }
      if (registro.Moneda) {
        moneda = String(registro.Moneda).toUpperCase();
      }
      let mostrarModal = false;
      if (moneda.includes('SOL') && monto >= 2000) {
        mostrarModal = true;
      } else if (moneda.includes('DOL') && monto >= 350) {
        mostrarModal = true;
      }
      // Nueva validación: mostrar popup solo si Subtotal > SubOc
      setLoadingDatosOc(true);
      setParamsOc(registro);
      try {
        const params = getDatosOcParams(registro);
        console.log('[Datos OC] Parámetros enviados a getDatosOc:', params);
        const data = await getDatosOc(params);
        let mostrarPopup = false;
        if (Array.isArray(data) && data.length > 0) {
          data.forEach(row => {
            if (row.SubOc !== undefined && row.Moneda !== undefined) {
              console.log(`[STORE] SubOc: ${row.SubOc}, Moneda: ${row.Moneda}, SubTotal (Resultados): ${registro.Subtotal}`);
              if (Number(registro.Subtotal) > Number(row.SubOc)) {
                mostrarPopup = true;
              }
            }
          });
        }
        if (mostrarPopup) {
          setModalVisible(true);
        } else {
          setModalVisible(false);
        }
        setDatosOc(data);
      } catch (e) {
        setDatosOc({ error: true, message: 'No se pudo obtener datos de OC' });
      }
      setLoadingDatosOc(false);
    }
    // Luego, continuar con la lógica normal de selección
    if (!registro || registro.IdResponsable === undefined || registro.IdResponsable === null || registro.IdResponsable === '') {
      setSnackbarMsg('No se puede seleccionar: falta IdResponsable');
      setSnackbarVisible(true);
      return;
    }
  };

   const toggleExpandido = (id) => {
     setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
   };

  const safe = v => {
    if (v === undefined || v === null) return '';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <Provider>
      <View style={styles.container}>
        <Card style={styles.filtrosCard}>
          <View style={styles.filtrosRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Buscar solicitante"
                value={filtroSolicitante}
                onChangeText={async text => {
                  setFiltroSolicitante(text);
                  setShowSuggestions(true);
                  await cargarSolicitantes(text);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{ backgroundColor: '#fff', marginRight: 4, minHeight: 40 }}
                dense={true}
              />
              {showSuggestions && filtroSolicitante.length > 0 && (
                <Card style={{ maxHeight: 200, marginBottom: 8 }}>
                  {solicitantes.filter(s => typeof s.NombreEmpleado === 'string' && s.NombreEmpleado.toLowerCase().includes(filtroSolicitante.toLowerCase())).length === 0 ? (
                    <List.Item title={<Text>No se encontraron solicitantes</Text>} />
                  ) : (
                    solicitantes.filter(s => typeof s.NombreEmpleado === 'string' && s.NombreEmpleado.toLowerCase().includes(filtroSolicitante.toLowerCase())).map(s => (
                      <List.Item
                        key={String(s.IdEmpleado || s.NombreEmpleado)}
                        title={String(s.NombreEmpleado)}
                        onPress={() => {
                          setFiltroSolicitante(s.NombreEmpleado);
                          setShowSuggestions(false);
                        }}
                      />
                    ))
                  )}
                </Card>
              )}
            </View>
            <Button
              mode="contained"
              onPress={buscar}
              style={styles.searchButton}
              icon="magnify"
              contentStyle={{ flexDirection: 'row-reverse', height: 36 }}
              accessibilityLabel="Buscar"
            />
          </View>
          <View style={styles.tabsContainerRow}>
            <Button
              mode={tab === 'todos' ? 'contained' : 'outlined'}
              style={styles.tabButton}
              onPress={() => setTab('todos')}
              labelStyle={{
                color: tab === 'todos' ? '#fff' : '#7B3FF2',
                fontSize: 13,
                textAlign: 'center',
              }}
            >Pendientes</Button>
            <Button
              mode={tab === 'seleccionados' ? 'contained' : 'outlined'}
              style={styles.tabButton}
              onPress={() => setTab('seleccionados')}
              labelStyle={{
                color: tab === 'seleccionados' ? '#fff' : '#7B3FF2',
                fontSize: 13,
                textAlign: 'center',
              }}
            >Seleccionados</Button>
          </View>
        </Card>
        {/* Etiqueta Resultados y Checkbox Todos antes del FlatList */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.seccionTitulo}>Resultados</Text>
              <Checkbox
                status={showCodVal ? 'checked' : 'unchecked'}
                onPress={() => {
                  setShowCodVal(prev => !prev);
                }}
                style={{ marginLeft: 8 }}
              />
              <Text style={{ fontSize: 15, color: '#333', fontWeight: 'bold', marginLeft: 2 }}>Todos</Text>
            </View>
            <Text style={{ fontSize: 15, color: '#7B3FF2', fontWeight: 'bold', textAlign: 'right', minWidth: 120 }}>
              {tab === 'todos'
                ? `${Array.isArray(resultados) ? resultados.length : 0} coincidencias`
                : `${Array.isArray(resultados) ? resultados.filter(item => Array.isArray(seleccionados) && seleccionados.includes(String(item.Corre))).length : 0} coincidencias`}
            </Text>
          </View>
          {/* Botones de paginación solo si hay más de 1 página y en la pestaña Pendientes */}
          {tab === 'todos' && Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize)) > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Button
                mode="outlined"
                onPress={() => setPage(1)}
                disabled={page === 1}
                style={{ marginHorizontal: 1, minWidth: 28, height: 28, paddingHorizontal: 0, paddingVertical: 0 }}
                labelStyle={{ fontSize: 13, paddingHorizontal: 0, lineHeight: 16 }}
                icon="chevron-double-left"
              />
              <Button
                mode="outlined"
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ marginHorizontal: 1, minWidth: 28, height: 28, paddingHorizontal: 0, paddingVertical: 0 }}
                labelStyle={{ fontSize: 13, paddingHorizontal: 0, lineHeight: 16 }}
                icon="chevron-left"
              />
              <Text style={{ marginHorizontal: 4 }}>
                Página {page} de {Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize))}
              </Text>
              <Button
                mode="outlined"
                onPress={() => setPage(p => (p < Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize))) ? p + 1 : p)}
                disabled={page >= Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize))}
                style={{ marginHorizontal: 1, minWidth: 28, height: 28, paddingHorizontal: 0, paddingVertical: 0 }}
                labelStyle={{ fontSize: 13, paddingHorizontal: 0, lineHeight: 16 }}
                icon="chevron-right"
              />
              <Button
                mode="outlined"
                onPress={() => setPage(Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize)))}
                disabled={page >= Math.max(1, Math.ceil((Array.isArray(resultados) ? resultados.length : 0) / pageSize))}
                style={{ marginHorizontal: 1, minWidth: 28, height: 28, paddingHorizontal: 0, paddingVertical: 0 }}
                labelStyle={{ fontSize: 13, paddingHorizontal: 0, lineHeight: 16 }}
                icon="chevron-double-right"
              />
            </View>
          )}
          <FlatList
            data={tab === 'todos'
              ? (Array.isArray(resultados) ? resultados.slice((page - 1) * pageSize, page * pageSize) : [])
              : (Array.isArray(resultados)
                ? resultados.filter(item => Array.isArray(seleccionados) && seleccionados.includes(String(item.Corre)))
                : [])}
            keyExtractor={(item) => `${safe(item.Corre)}_${safe(item.IdSite)}`}
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const uniqueId = String(item.Corre);
              return (
                <Card style={{ marginBottom: 4, padding: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Checkbox
                        status={Array.isArray(seleccionados) && seleccionados.includes(uniqueId) ? 'checked' : 'unchecked'}
                        onPress={() => toggleSeleccion(uniqueId)}
                      />
                      <Text style={{ fontSize: 12, color: '#888', fontWeight: 'bold', marginLeft: 2 }}>Nro: {asText(item.Corre)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Button
                        mode="text"
                        onPress={() => toggleExpandido(uniqueId)}
                        compact={true}
                        style={{ minWidth: 110, height: 32, borderRadius: 16, paddingVertical: 0, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', marginRight: 2, borderWidth: 0, backgroundColor: 'transparent' }}
                        labelStyle={{ color: '#7B3FF2', fontSize: 12, lineHeight: 15, fontWeight: 'bold' }}
                      >
                        {expandido[uniqueId] ? 'Ocultar' : 'Ver Detalle'}
                      </Button>
                      <Button
                        mode="text"
                        onPress={async () => {
                          setDatosOc(null);
                          setLoadingDatosOc(true);
                          setModalVisible(true);
                          setParamsOc(item);
                          try {
                            const params = getDatosOcParams(item);
                            const data = await getDatosOc(params);
                            setDatosOc(data);
                          } catch (e) {
                            setDatosOc({ error: true, message: 'No se pudo obtener datos de OC' });
                          }
                          setLoadingDatosOc(false);
                        }}
                        compact={true}
                        style={{ minWidth: 80, height: 32, borderRadius: 16, paddingVertical: 0, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 0, backgroundColor: 'transparent' }}
                        labelStyle={{ color: '#2196F3', fontSize: 12, lineHeight: 15, fontWeight: 'bold' }}
                      >
                        Datos OC
                      </Button>
                    </View>
                  </View>
                  <View style={[styles.cell, { flexDirection: 'row', alignItems: 'center' }]}> 
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <Text style={styles.cellLabel}>Fecha:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.FecIngreso)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <Text style={styles.cellLabel}>Total:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Subtotal)} {asText(item.Moneda)}</Text>
                    </View>
                  </View>
                  <View style={styles.cell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cellLabel}>Sol.:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Solicitante)}</Text>
                    </View>
                  </View>
                  <View style={styles.cell}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.cellLabel}>Responsable:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Responsable)}</Text>
                    </View>
                  </View>
                  {item.SubOc !== undefined && item.SubOc !== null && item.SubOc !== '' ? (
                    <View style={styles.cell}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Monto OC:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.SubOc)} {asText(item.Moneda)}</Text>
                      </View>
                    </View>
                  ) : null}
                  {expandido[uniqueId] ? (
                    <View style={styles.detalleCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Fecha:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.FecIngreso)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Detalle:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Detalle)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Bien/Servicio:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Bien)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Comprobante:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Comprobante)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Gestor:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Gestor)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Proyecto:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.nombreProyecto)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Site:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Site)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Subtotal:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Subtotal)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>IGV:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.IGV)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Estado:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.EstadoPla)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.cellLabel}>Observación:</Text>
                        <Text style={{ fontSize: 13 }}>{asText(item.Observacion)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.cellLabel, { color: '#7B3FF2', fontWeight: 'bold' }]}>Total del registro:</Text>
                        <Text style={{ fontSize: 13, color: '#7B3FF2', fontWeight: 'bold' }}>{asText(item.Subtotal)}</Text>
                      </View>
                    </View>
                  ) : null}
                </Card>
              );
            }}
          />
          {/* Botones de acción solo en la pestaña Seleccionados */}
          {tab === 'seleccionados' ? (
            <View style={{ width: '100%' }}>
              <View style={styles.actionButtonsRow}>
                <Button
                  mode="contained"
                  disabled={seleccionados.length === 0}
                  style={[
                    styles.actionButtonFull,
                    { backgroundColor: seleccionados.length === 0 ? '#BDBDBD' : '#4CAF50' }
                  ].filter(Boolean)}
                  labelStyle={{ color: '#fff', textAlign: 'center', fontSize: 13 }}
                  onPress={() => {
                    setAccionActual('aprobar');
                    setConfirmModalVisible(true);
                  }}
                >Aprobar recibo</Button>
                <Button
                  mode="contained"
                  disabled={seleccionados.length === 0}
                  style={[
                    styles.actionButtonFull,
                    { backgroundColor: seleccionados.length === 0 ? '#BDBDBD' : '#F44336' }
                  ].filter(Boolean)}
                  labelStyle={{ color: '#fff', textAlign: 'center', fontSize: 13 }}
                  onPress={() => {
                    setRechazoConfirmVisible(true);
                  }}
                >Rechazar</Button>
              </View>
              <View style={[styles.actionButtonsRow, { marginTop: 4 }]}> 
                <Button
                  mode="contained"
                  disabled={seleccionados.length === 0}
                  style={[
                    styles.actionButtonFull,
                    { backgroundColor: seleccionados.length === 0 ? '#BDBDBD' : '#FF9800' }
                  ].filter(Boolean)}
                  labelStyle={{ color: '#fff', textAlign: 'center', fontSize: 13 }}
                  onPress={() => {
                    setObservarConfirmVisible(true);
                  }}
                >Observar</Button>
                <Button
                  mode="contained"
                  disabled={seleccionados.length === 0}
                  style={[
                    styles.actionButtonFull,
                    { backgroundColor: seleccionados.length === 0 ? '#BDBDBD' : '#2196F3' }
                  ].filter(Boolean)}
                  labelStyle={{ color: '#fff', textAlign: 'center', fontSize: 13 }}
                  onPress={() => {
                    setAccionActual('regularizar');
                    setConfirmModalVisible(true);
                  }}
                >Regularizar</Button>
              </View>
            </View>
          ) : null}
        </View>
        <Portal>
          {/* Modal de confirmación para rechazar */}
          <Modal visible={rechazoConfirmVisible} onDismiss={() => setRechazoConfirmVisible(false)} contentContainerStyle={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>¿Está seguro que desea rechazar los pagos seleccionados?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%' }}>
                <Button mode="outlined" onPress={() => setRechazoConfirmVisible(false)}>Cancelar</Button>
                <Button mode="contained" style={{ marginLeft: 8 }} labelStyle={{ color: '#fff' }} onPress={() => {
                  setRechazoConfirmVisible(false);
                  setAccionActual('rechazar');
                  setConfirmModalVisible(true);
                }}>Sí, rechazar</Button>
              </View>
            </View>
          </Modal>
          {/* Modal de confirmación para observar */}
          <Modal visible={observarConfirmVisible} onDismiss={() => setObservarConfirmVisible(false)} contentContainerStyle={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>¿Está seguro que desea observar los pagos seleccionados?</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%' }}>
                <Button mode="outlined" onPress={() => setObservarConfirmVisible(false)}>Cancelar</Button>
                <Button mode="contained" style={{ marginLeft: 8 }} labelStyle={{ color: '#fff' }} onPress={() => {
                  setObservarConfirmVisible(false);
                  setAccionActual('observar');
                  setConfirmModalVisible(true);
                }}>Sí, observar</Button>
              </View>
            </View>
          </Modal>
          {/* Modal de confirmación para aprobar/rechazar/observar/regularizar */}
          <Modal visible={confirmModalVisible} onDismiss={() => { setConfirmModalVisible(false); setObservacionInput(''); }} contentContainerStyle={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>
                {accionActual === 'aprobar' ? 'Confirmar aprobación' : accionActual === 'rechazar' ? 'Confirmar rechazo' : accionActual === 'regularizar' ? 'Confirmar regularización' : 'Confirmar observación'}
              </Text>
              {(accionActual === 'rechazar' || accionActual === 'observar') && (
                <TextInput
                  label="Ingrese observación"
                  value={observacionInput}
                  onChangeText={setObservacionInput}
                  multiline
                  numberOfLines={3}
                  style={{ marginBottom: 12, backgroundColor: '#fff', width: 300, maxWidth: '100%' }}
                  maxLength={200}
                />
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', width: '100%' }}>
                <Button mode="outlined" onPress={() => { setConfirmModalVisible(false); setObservacionInput(''); }}>Cancelar</Button>
                <Button
                  mode="contained"
                  style={{ marginLeft: 8 }}
                  labelStyle={{ color: '#fff' }}
                  onPress={async () => {
                    if ((accionActual === 'rechazar' || accionActual === 'observar') && !observacionInput.trim()) {
                      setSnackbarMsg('Debe ingresar una observación.');
                      setSnackbarVisible(true);
                      return;
                    }
                    setConfirmModalVisible(false);
                    let ipLocalMod = ipLocal;
                    if (!ipLocalMod) {
                      ipLocalMod = '192.168.0.1';
                    }
                    const seleccionadosData = resultados.filter(item => seleccionados.includes(String(item.Corre)));
                    let IdEstValue = 1;
                    if (accionActual === 'rechazar') IdEstValue = 3;
                    if (accionActual === 'observar') IdEstValue = 2;
                    const montoLimiteSoles = 2000;
                    const montoLimiteDolares = 530;
                    const paramsList = seleccionadosData.map(item => {
                      let IdEst = IdEstValue;
                      if (accionActual === 'aprobar') {
                        const monto = Number(item.Total);
                        const moneda = (item.Moneda || '').toUpperCase();
                        if ((moneda.includes('SOL') && monto > 2000) || (moneda.includes('DOL') && monto > 530)) {
                          IdEst = 6;
                        }
                      }
                      return {
                        ipLocal: String(ipLocalMod),
                        CorFil: parseInt(item.Corre, 10),
                        cIdSite: String(item.IdSite),
                        IdEst,
                        IdResponsable: item.IdResponsable !== undefined ? parseInt(item.IdResponsable, 10) : null,
                        txtOb: (accionActual === 'rechazar' || accionActual === 'observar') ? observacionInput : (item.Observacion !== undefined ? String(item.Observacion) : ''),
                        cIdRegularizar: accionActual === 'regularizar' ? 1 : 0
                      };
                    });
                    if (accionActual === 'aprobar' && paramsList.some(p => p.IdEst === 6)) {
                      setSnackbarMsg('Monto debe pasar por RE-APROBACION');
                      setSnackbarVisible(true);
                    }
                    (async () => {
                      let errores = [];
                      let sqlDebugsTemp = [];
                      for (const params of paramsList) {
                        try {
                          const resp = await aprobarPlanilla(params);
                          if (resp && resp.data && resp.data.sqlDebug) {
                            sqlDebugsTemp.push(`Corre ${params.CorFil}: ${resp.data.sqlDebug}`);
                            console.log(`SQL ejecutado para Corre ${params.CorFil}:`, resp.data.sqlDebug);
                          }
                          if (resp && resp.data && resp.data.message) {
                            setSnackbarMsg(`Corre ${params.CorFil}: ${resp.data.message}`);
                            setSnackbarVisible(true);
                          }
                        } catch (e) {
                          console.error(`Error en Corre ${params.CorFil}:`, e);
                          errores.push(`Error en Corre ${params.CorFil}: ${e?.response?.data?.message || e.message}`);
                        }
                      }
                      if (errores.length === 0) {
                        setSnackbarMsg(accionActual === 'aprobar' ? 'Aprobación exitosa.' : accionActual === 'rechazar' ? 'Rechazo exitoso.' : accionActual === 'regularizar' ? 'Regularización exitosa.' : 'Observación exitosa.');
                      } else {
                        setSnackbarMsg('Algunos registros no se procesaron: ' + errores.join('; '));
                      }
                      setSnackbarVisible(true);
                      cargarAprobaciones();
                    })();
                    setObservacionInput('');
                  }}
                >{accionActual === 'aprobar' ? 'Aprobar' : accionActual === 'rechazar' ? 'Rechazar' : accionActual === 'regularizar' ? 'Regularizar' : 'Observar'}</Button>
              </View>
            </View>
          </Modal>
          {/* Modal Datos OC */}
          <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>Datos OC</Text>
              {loadingDatosOc && (
                <ActivityIndicator animating size="large" style={{ marginVertical: 16 }} />
              )}
              {!loadingDatosOc && Array.isArray(datosOc) && datosOc.length > 0 && (
                datosOc.map((row, idx) => {
                  // Buscar el registro original seleccionado para mostrar el Total
                  let registroOriginal = null;
                  if (paramsOc && paramsOc.Total !== undefined) {
                    registroOriginal = paramsOc;
                  } else if (paramsOc && paramsOc.Corre && resultados && Array.isArray(resultados)) {
                    registroOriginal = resultados.find(r => String(r.Corre) === String(paramsOc.Corre));
                  }
                  // Calcular montos para mostrar explícitamente
                  let montoPagoFicticio = null;
                  let montoPago = null;
                  if (row.SubPlanilla !== undefined && registroOriginal && !isNaN(Number(row.SubPlanilla)) && !isNaN(Number(registroOriginal.Subtotal))) {
                    montoPagoFicticio = Number(row.SubPlanilla) + Number(registroOriginal.Subtotal);
                    montoPago = Number(row.SubPlanilla);
                  }
                  return (
                    <View key={idx} style={{ marginBottom: 12 }}>
                      {Object.entries(row)
                        .filter(([key]) => key !== 'IdMoneda')
                        .map(([key, value]) => {
                          let label = key;
                          if (key === 'idoc') label = 'OC';
                          else if (key === 'SubOc') label = 'Monto OC';
                          else if (key === 'SubPlanilla') label = 'Monto Pago';
                          else if (key === 'Porce') label = 'Porcentaje';
                          return (
                            <View key={key} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 2 }}>
                              <Text style={styles.cellLabel}>{label}:</Text>
                              <Text>{asText(value)}</Text>
                            </View>
                          );
                        })}
                      {registroOriginal && (
                        <View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 8 }}>
                            <Text style={[styles.cellLabel, { fontWeight: 'bold', color: '#7B3FF2' }]}>Total del registro:</Text>
                            <Text style={{ fontWeight: 'bold', color: '#7B3FF2' }}>{String(registroOriginal.Subtotal ?? '')} {String(registroOriginal.Moneda ?? '')}</Text>
                          </View>
                          {montoPagoFicticio !== null && montoPago !== null && (
                            <View>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 4 }}>
                                <Text style={[styles.cellLabel, { fontWeight: 'bold', color: '#F44336' }]}>Monto Pago ficticio:</Text>
                                <Text style={{ fontWeight: 'bold', color: '#F44336' }}>{String(montoPagoFicticio ?? '')} {String(registroOriginal.Moneda ?? '')}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 4 }}>
                                <Text style={[styles.cellLabel, { fontWeight: 'bold', color: '#2196F3' }]}>Monto Pago:</Text>
                                <Text style={{ fontWeight: 'bold', color: '#2196F3' }}>{String(montoPago ?? '')} {String(registroOriginal.Moneda ?? '')}</Text>
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
              {!loadingDatosOc && Array.isArray(datosOc) && datosOc.length === 0 && (
                <Text>No hay resultados para la OC.</Text>
              )}
              {!loadingDatosOc && datosOc?.error && (
                <Text style={{ color: 'red' }}>
                  Error: {String(datosOc.message ?? '')}
                </Text>
              )}
              <Button
                mode="contained"
                onPress={() => setModalVisible(false)}
                style={{ marginTop: 16 }}
                labelStyle={{ color: '#fff' }}
              >Cerrar</Button>
            </View>
          </Modal>
          {/* Snackbar */}
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={2500}
            style={{
              backgroundColor:
                typeof snackbarMsg === 'string' && snackbarMsg.includes('exitosa')
                  ? '#4CAF50'
                  : '#F44336'
            }}
          >
            <Text style={{ color: '#fff' }}>{asText(snackbarMsg)}</Text>
          </Snackbar>
          {/* Modal para mostrar SQL Debug */}
          <Modal visible={sqlDebugModalVisible} onDismiss={() => setSqlDebugModalVisible(false)} contentContainerStyle={styles.modalContainer}>
            <View>
              <Text style={styles.modalTitle}>SQL ejecutado</Text>
              {sqlDebugs.length > 0 ? sqlDebugs.map((sql, idx) => (
                <Text key={idx} style={{marginBottom: 8, fontSize: 12, color: '#333'}}>{typeof sql === 'string' ? sql : JSON.stringify(sql)}</Text>
              )) : <Text>No hay SQL para mostrar.</Text>}
              <Button mode="contained" style={{marginTop: 12}} labelStyle={{ color: '#fff' }} onPress={() => setSqlDebugModalVisible(false)}>Cerrar</Button>
            </View>
          </Modal>
        </Portal>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
    filtrosRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    tabsContainerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 0,
    },
    tabsContainer: {
      display: 'none', // Oculto, ya no se usa
    },
    tabButton: {
      marginHorizontal: 4,
      borderRadius: 8,
      minWidth: 100,
      height: 36,
      paddingVertical: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchButton: {
      minWidth: 36,
      width: 36,
      height: 36,
      borderRadius: 18,
      marginLeft: 4,
      backgroundColor: '#7B3FF2',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 0,
      paddingHorizontal: 0,
      elevation: 2,
    },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  filtrosCard: {
    marginBottom: 16,
    padding: 12,
  },
  resultadosCard: {
    flex: 1,
    marginBottom: 16,
    padding: 12,
  },
  seccionTitulo: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  cellLabel: {
    fontWeight: 'bold',
    color: '#7B3FF2',
    marginRight: 4,
  },
  detalleCard: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    marginTop: 8,
    borderRadius: 8,
    elevation: 2,
  },
  expandButton: {
    alignSelf: 'flex-end',
    marginVertical: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
    width: '100%',
  },
  actionButtonFull: {
    flex: 1,
    marginHorizontal: 2,
    minWidth: 0,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 7,
    maxWidth: '100%',
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 24,
    borderRadius: 12,
    alignItems: 'flex-start',
    elevation: 4,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    color: '#7B3FF2',
  },
});
