import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Text as RNText } from 'react-native';
import { Card, Button, TextInput, Text, List, Checkbox } from 'react-native-paper';
import { getSolicitantes } from '../api/solicitantes';

export default function AsistenciaScreen() {
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroFechaInicial, setFiltroFechaInicial] = useState('');
  const [filtroFechaFinal, setFiltroFechaFinal] = useState('');
  const [errorFechaInicial, setErrorFechaInicial] = useState('');
  const [errorFechaFinal, setErrorFechaFinal] = useState('');
  const [filtroObservadas, setFiltroObservadas] = useState(false);
  const [filtroFueraDeZona, setFiltroFueraDeZona] = useState(false);
  const [detalleBusqueda, setDetalleBusqueda] = useState([]);
  const [tab, setTab] = useState('detalle');
  const [solicitantes, setSolicitantes] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    cargarSolicitantes('');
  }, []);

  const cargarSolicitantes = async (nombre = '') => {
    try {
      const data = await getSolicitantes(nombre);
      setSolicitantes(Array.isArray(data) ? data : []);
    } catch (error) {
      setSolicitantes([]);
    }
  };

  const esFechaValida = (fechaTexto) => {
    const valor = String(fechaTexto || '').trim();
    if (!valor) return true;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    if (!match) return false;
    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);
    const fecha = new Date(anio, mes - 1, dia);
    return (
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes - 1 &&
      fecha.getDate() === dia
    );
  };

  const parseFecha = (fechaTexto) => {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(fechaTexto || '').trim());
    if (!match) return null;
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  };

  const fechaMinima = new Date(2024, 0, 1);

  const validarFechaCampo = (fechaTexto) => {
    const valor = String(fechaTexto || '').trim();
    if (!valor) return '';
    if (!esFechaValida(valor)) return 'Formato inválido (dd/mm/yyyy).';
    const fecha = parseFecha(valor);
    if (fecha && fecha < fechaMinima) return 'La fecha mínima es 01/01/2024';
    return '';
  };

  const validarFechas = () => {
    const errorInicial = validarFechaCampo(filtroFechaInicial);
    const errorFinal = validarFechaCampo(filtroFechaFinal);

    setErrorFechaInicial(errorInicial);
    setErrorFechaFinal(errorFinal);

    return !errorInicial && !errorFinal;
  };

  const buscar = () => {
    if (!validarFechas()) return;

    const detalle = [
      { key: 'Solicitante', value: filtroSolicitante.trim() || 'Todos' },
      { key: 'Fecha inicial', value: filtroFechaInicial.trim() || 'Sin definir' },
      { key: 'Fecha final', value: filtroFechaFinal.trim() || 'Sin definir' },
      { key: 'Observadas', value: filtroObservadas ? 'Sí' : 'No' },
      { key: 'Fuera de zona', value: filtroFueraDeZona ? 'Sí' : 'No' },
    ];
    setDetalleBusqueda(detalle);
  };

  const hayDetalle = useMemo(() => detalleBusqueda.length > 0, [detalleBusqueda]);
  const agrupadoBusqueda = useMemo(() => {
    if (!hayDetalle) return [];
    const solicitante = detalleBusqueda.find((item) => item.key === 'Solicitante')?.value || 'Todos';
    const fechaInicio = detalleBusqueda.find((item) => item.key === 'Fecha inicial')?.value || 'Sin definir';
    const fechaFinal = detalleBusqueda.find((item) => item.key === 'Fecha final')?.value || 'Sin definir';
    return [
      { key: 'Solicitante', value: solicitante },
      { key: 'Rango de fechas', value: `${fechaInicio} - ${fechaFinal}` },
    ];
  }, [detalleBusqueda, hayDetalle]);

  return (
    <View style={styles.container}>
      <Card style={styles.filtrosCard}>
        <View style={styles.filtrosRow}>
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="Buscar solicitante"
              value={filtroSolicitante}
              onChangeText={async (text) => {
                setFiltroSolicitante(text);
                setShowSuggestions(true);
                await cargarSolicitantes(text);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              style={styles.inputCompacto}
              dense
            />
            {showSuggestions && filtroSolicitante.length > 0 && (
              <Card style={styles.suggestionsCard}>
                {solicitantes.filter(s => typeof s.NombreEmpleado === 'string' && s.NombreEmpleado.toLowerCase().includes(filtroSolicitante.toLowerCase())).length === 0 ? (
                  <List.Item title={<Text>No se encontraron solicitantes</Text>} />
                ) : (
                  solicitantes
                    .filter(s => typeof s.NombreEmpleado === 'string' && s.NombreEmpleado.toLowerCase().includes(filtroSolicitante.toLowerCase()))
                    .map(s => (
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

        <View style={styles.filtrosRow}>
          <View style={styles.fechaInputContainer}>
            <TextInput
              placeholder="Desde(dd/mm/yyyy)"
              value={filtroFechaInicial}
              onChangeText={(text) => {
                setFiltroFechaInicial(text);
                if (errorFechaInicial) {
                  setErrorFechaInicial(validarFechaCampo(text));
                }
              }}
              style={styles.inputCompacto}
              error={Boolean(errorFechaInicial)}
              dense
            />
            {errorFechaInicial ? <RNText style={styles.errorText}>{errorFechaInicial}</RNText> : null}
          </View>
          <View style={styles.fechaInputContainer}>
            <TextInput
              placeholder="Hasta(dd/mm/yyyy)"
              value={filtroFechaFinal}
              onChangeText={(text) => {
                setFiltroFechaFinal(text);
                if (errorFechaFinal) {
                  setErrorFechaFinal(validarFechaCampo(text));
                }
              }}
              style={styles.inputCompacto}
              error={Boolean(errorFechaFinal)}
              dense
            />
            {errorFechaFinal ? <RNText style={styles.errorText}>{errorFechaFinal}</RNText> : null}
          </View>
        </View>

        <View style={styles.filtrosRow}>
          <View style={styles.checkboxRow}>
            <Checkbox
              status={filtroObservadas ? 'checked' : 'unchecked'}
              onPress={() => setFiltroObservadas((prev) => !prev)}
            />
            <Text onPress={() => setFiltroObservadas((prev) => !prev)} style={styles.checkboxLabel}>
              Observadas
            </Text>
          </View>
          <View style={styles.checkboxRow}>
            <Checkbox
              status={filtroFueraDeZona ? 'checked' : 'unchecked'}
              onPress={() => setFiltroFueraDeZona((prev) => !prev)}
            />
            <Text onPress={() => setFiltroFueraDeZona((prev) => !prev)} style={styles.checkboxLabel}>
              Fuera de zona
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.resultadosCard}>
        <View style={styles.tabsContainerRow}>
          <Button
            mode={tab === 'detalle' ? 'contained' : 'outlined'}
            style={styles.tabButton}
            onPress={() => setTab('detalle')}
            labelStyle={{
              color: tab === 'detalle' ? '#fff' : '#7B3FF2',
              fontSize: 13,
              textAlign: 'center',
            }}
          >Detalle</Button>
          <Button
            mode={tab === 'agrupado' ? 'contained' : 'outlined'}
            style={styles.tabButton}
            onPress={() => setTab('agrupado')}
            labelStyle={{
              color: tab === 'agrupado' ? '#fff' : '#7B3FF2',
              fontSize: 13,
              textAlign: 'center',
            }}
          >Agrupado</Button>
        </View>

        <Text style={styles.seccionTitulo}>{tab === 'detalle' ? 'Detalle de búsqueda' : 'Agrupado'}</Text>

        {!hayDetalle ? (
          <RNText style={styles.emptyText}>Aún no hay resultados. Usa los filtros y presiona buscar.</RNText>
        ) : (
          <FlatList
            data={tab === 'detalle' ? detalleBusqueda : agrupadoBusqueda}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <View style={styles.detalleRow}>
                <Text style={styles.cellLabel}>{item.key}:</Text>
                <RNText>{item.value}</RNText>
              </View>
            )}
          />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  filtrosCard: {
    marginBottom: 8,
    padding: 6,
  },
  filtrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
    minHeight: 36,
    paddingVertical: 2,
  },
  inputCompacto: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 32,
    height: 32,
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
  tabsContainerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    marginHorizontal: 4,
    borderRadius: 8,
    minWidth: 120,
    height: 44,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
  },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cellLabel: {
    fontWeight: 'bold',
    color: '#7B3FF2',
    marginRight: 4,
  },
  suggestionsCard: {
    maxHeight: 200,
    marginBottom: 8,
  },
  fechaInputContainer: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: '#231F36',
  },
  errorText: {
    color: '#B00020',
    fontSize: 12,
    marginTop: 2,
  },
});
