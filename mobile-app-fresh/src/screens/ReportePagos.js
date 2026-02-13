  // Utilidad para truncar etiquetas del eje X
  const truncateLabel = (label) => {
    if (typeof label !== 'string') return '';
    return label.length > 10 ? label.slice(0, 10) + '…' : label;
  };
import React, { useState, useEffect } from 'react';
// Utilidad para asegurar que todo lo que se renderiza en celdas sea string
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
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, DataTable, ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { getReporteGastos } from '../api/ReporteGastos';
import { BarChart } from 'react-native-chart-kit';
import MonedaMultiSelect from '../components/MonedaMultiSelect';
import AnoMultiSelect from '../components/AnoMultiSelect';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ReportePagosScreen() {
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({});
  const [monedasSeleccionadas, setMonedasSeleccionadas] = useState([]);
  // Inicializar con el año en curso
  const currentYear = new Date().getFullYear();
  const [anosSeleccionados, setAnosSeleccionados] = useState([currentYear]);
  const navigation = useNavigation();

  const cargarDatos = async (monedasParam = monedasSeleccionadas, anosParam = anosSeleccionados) => {
    setLoading(true);
    setError('');
    try {
      const res = await getReporteGastos(monedasParam, anosParam);
      if (res.error) throw new Error(res.message);
      setResultados(res.result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos(monedasSeleccionadas, anosSeleccionados);
  }, []);

  useEffect(() => {
    cargarDatos(monedasSeleccionadas, anosSeleccionados);
  }, [anosSeleccionados]);

  const columnas = resultados[0] ? Object.keys(resultados[0]) : [];
  const filtrar = (col, val) => {
    setFiltros({ ...filtros, [col]: val });
  };

  const monedas = Array.from(new Set(resultados.map(r => r.Moneda))).filter(Boolean);
  // Obtener años únicos de los resultados
  const anos = Array.from(new Set(resultados.map(r => r.Ano))).filter(Boolean).sort((a, b) => b - a);

  // Ya no es necesario seleccionar automáticamente el año más reciente, porque se inicializa con el año en curso

  const resultadosFiltrados = resultados.filter(row => {
    let cumpleMoneda = true;
    if (monedasSeleccionadas.length > 0) {
      const normalizar = v => (v || '').toString().trim().toUpperCase().replace(/[^A-Z ]/g, '');
      cumpleMoneda = monedasSeleccionadas.some(m => normalizar(row.Moneda) === normalizar(m));
    }
    let cumpleAno = true;
    if (anosSeleccionados.length > 0) {
      cumpleAno = anosSeleccionados.map(Number).includes(Number(row.Ano));
    }
    return cumpleMoneda && cumpleAno && Object.entries(filtros).every(([col, val]) =>
      !val || String(row[col]).toLowerCase().includes(String(val).toLowerCase())
    );
  });

  // Agrupar resultados por Proyecto y Moneda si hay más de un año seleccionado
  let resultadosParaMostrar = resultadosFiltrados;
  if (anosSeleccionados.length > 1) {
    const agrupados = {};
    resultadosFiltrados.forEach(row => {
      const key = `${row.Proyecto}__${row.Moneda}`;
      if (!agrupados[key]) {
        agrupados[key] = { ...row, Subtotal: 0 };
      }
      agrupados[key].Subtotal += Number(row.Subtotal || 0);
    });
    resultadosParaMostrar = Object.values(agrupados)
      .map(r => {
        // Eliminar campo Ano para que no se muestre en la tabla
        const { Ano, ...rest } = r;
        return rest;
      })
      .sort((a, b) => b.Subtotal - a.Subtotal);
  }

  // Gráfico: solo toma la primera moneda seleccionada para el gráfico
  const monedaGrafico = monedasSeleccionadas[0] || '';
  const proyectosConSubtotal = resultadosFiltrados
    .filter(r => monedaGrafico ? r.Moneda && r.Moneda.toUpperCase() === monedaGrafico.toUpperCase() : true)
    .reduce((acc, r) => {
      if (!acc[r.Proyecto]) acc[r.Proyecto] = 0;
      acc[r.Proyecto] += Number(r.Subtotal || 0);
      return acc;
    }, {});
  const proyectosPorMoneda = Object.entries(proyectosConSubtotal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([proyecto]) => proyecto);

  // Escala dinámica para el gráfico
  const maxValor = Math.max(...Object.values(proyectosConSubtotal), 0);
  let escala = 1000;
  let sufijo = 'K';
  if (maxValor >= 1000000) {
    escala = 1000000;
    sufijo = 'M';
  }
  const valoresPorProyecto = proyectosPorMoneda.map(proyecto => (proyectosConSubtotal[proyecto] || 0) / escala);

  const chartData = {
    labels: proyectosPorMoneda.map(truncateLabel),
    datasets: [
      {
        data: valoresPorProyecto,
      },
    ],
  };

  // Exportar resultados filtrados a CSV (web y móvil)
  const exportarResultados = async () => {
    if (!resultadosFiltrados.length) return;
    const columnasExport = Object.keys(resultadosFiltrados[0]);
    const csvRows = [
      columnasExport.join(','),
      ...resultadosFiltrados.map(row =>
        columnasExport.map(col => `"${String(row[col]).replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const csvString = csvRows.join('\n');

    if (Platform.OS === 'web') {
      // Descargar en web
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_pagos.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else if (Platform.OS === 'ios' || Platform.OS === 'windows') {
      // Exportar solo usando expo-file-system (si está disponible)
      try {
        const FileSystem = await import('expo-file-system');
        const fileUri = FileSystem.cacheDirectory + 'reporte_pagos.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
        alert('Archivo CSV exportado en: ' + fileUri);
      } catch (e) {
        alert('No se pudo exportar el archivo CSV en este dispositivo.');
      }
    } else {
      alert('Exportación no disponible en este dispositivo.');
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.cardGrafico}>
        <AnoMultiSelect anos={anos} seleccionados={anosSeleccionados} onChange={setAnosSeleccionados} />
        <MonedaMultiSelect
          monedas={monedas}
          seleccionadas={monedasSeleccionadas}
          onChange={arr => {
            setMonedasSeleccionadas(arr);
            cargarDatos(arr, anosSeleccionados);
          }}
        />
        {monedasSeleccionadas.length > 1 ? (
          <Text style={{ color: 'orange', marginTop: 16, textAlign: 'center' }}>
            El gráfico está habilitado solo cuando se selecciona una moneda.
          </Text>
        ) : (
          <BarChart
            data={chartData}
            width={300}
            height={160}
            yAxisLabel=""
            yAxisSuffix={sufijo}
            chartConfig={{
              backgroundColor: '#e3f2fd',
              backgroundGradientFrom: '#e3f2fd',
              backgroundGradientTo: '#e3f2fd',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(123, 63, 242, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(44, 44, 44, ${opacity})`,
            }}
            style={{ marginVertical: 8 }}
          />
        )}
      </Card>
      <ScrollView style={{ flex: 1 }}>
        <Card style={styles.cardResultados}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.resultadosTitle}>Resultados</Text>
            {(Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'windows') ? (
              <Button mode="outlined" onPress={exportarResultados} style={[styles.button, { marginLeft: 8, marginRight: 0 }]}>Exportar Resultados</Button>
            ) : null}
          </View>
          {loading ? (
            <ActivityIndicator animating size="large" style={{ marginVertical: 16 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
              <DataTable>
                <DataTable.Header>
                  {columnas.map((col) => (
                    <DataTable.Title
                      key={col}
                      numeric={col === 'Subtotal'}
                      style={
                        col === 'Proyecto'
                          ? { minWidth: 160, maxWidth: 300, flex: 2 }
                          : col === 'Subtotal'
                          ? { justifyContent: 'flex-end' }
                          : col === 'Moneda'
                          ? { justifyContent: 'center', minWidth: 36, maxWidth: 48, paddingHorizontal: 0 }
                          : undefined
                      }
                    >
                      {col === 'Moneda' ? '' : col}
                    </DataTable.Title>
                  ))}
                </DataTable.Header>
                {resultadosParaMostrar.map((row, idx) => (
                  <DataTable.Row
                    key={idx}
                    onPress={() => {
                      const tieneAno = 'Ano' in row && row.Ano !== undefined && row.Ano !== null;
                      // Si hay años seleccionados, pásalos como arreglo; si no, solo el año del row
                      let anosToSend = [];
                      if (anosSeleccionados && anosSeleccionados.length > 0) {
                        anosToSend = anosSeleccionados.filter(a => a !== undefined && a !== null && a !== '');
                      } else if (tieneAno) {
                        anosToSend = [row.Ano];
                      }
                      navigation.navigate('DetallePagos', {
                        proyecto: row.Proyecto,
                        anos: anosToSend,
                      });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {columnas
                      .filter(col => !(anosSeleccionados.length > 1 && col === 'Ano'))
                      .map((col) => (
                        <DataTable.Cell
                          key={col}
                          numeric={col === 'Subtotal'}
                          style={
                            col === 'Proyecto'
                              ? { minWidth: 160, maxWidth: 300, flex: 2 }
                              : col === 'Subtotal'
                              ? { justifyContent: 'flex-end' }
                              : col === 'Moneda'
                              ? { justifyContent: 'center', minWidth: 36, maxWidth: 48, paddingHorizontal: 0 }
                              : undefined
                          }
                        >
                          {(() => {
                            if (col === 'Subtotal' && !isNaN(Number(row[col]))) {
                              return asText(Number(row[col]).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            } else if (col === 'Suma' && !isNaN(Number(row[col]))) {
                              return asText(Number(row[col]).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            } else if (col === 'Moneda') {
                              if (row[col] === 'SOLES') return asText('(S/.)');
                              if (row[col] === 'DOLARES') return asText('$');
                              if (row[col] === 'EUROS') return asText('€');
                              if (row[col] === 'PESO DOMINICANO') return asText('RD$');
                              return asText(row[col]);
                            } else {
                              return asText(row[col]);
                            }
                          })()}
                        </DataTable.Cell>
                      ))}
                  </DataTable.Row>
                ))}
              </DataTable>
            </ScrollView>
          )}
          {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
          {!loading && resultados.length === 0 && (
            <Text style={{ color: 'orange', marginTop: 8 }}>
              No hay datos para el año seleccionado.
            </Text>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  cardKpi: { margin: 12, padding: 16, backgroundColor: '#e3f2fd' },
  cardGrafico: { margin: 12, padding: 16 },
  cardResultados: { margin: 12, padding: 16 },
  kpiTitle: { fontWeight: 'bold', marginBottom: 8 },
  graficoTitle: { fontWeight: 'bold', marginBottom: 8 },
  resultadosTitle: { fontWeight: 'bold', marginBottom: 8 },
  button: { margin: 12 },
});
