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
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TextInput, Button, Card, Text, DataTable, ActivityIndicator } from 'react-native-paper';
import { getReportePlanillaDinamico } from '../api/ReportePlanillaDinamico';

export default function ReportePlanillaScreen() {
  const [proyecto, setProyecto] = useState('');
  const [cliente, setCliente] = useState('');
  const [moneda, setMoneda] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState('');

  const handleBuscar = async () => {
    setLoading(true);
    setError('');
    setResultados([]);
    try {
      const params = {
        Proyecto: proyecto || null,
        Cliente: cliente || null,
        Moneda: moneda ? parseInt(moneda, 10) : null,
        Estado: estado ? parseInt(estado, 10) : null,
      };
      const res = await getReportePlanillaDinamico(params);
      console.log('Respuesta del backend:', res);
      if (res.error) throw new Error(res.message);
      setResultados(res.result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const kpi = resultados.reduce(
    (acc, r) => {
      acc.Subtotal += Number(r.Subtotal || 0);
      acc.IGV += Number(r.IGV || 0);
      acc.Total += Number(r.Total || 0);
      acc.MontoRetencion += Number(r.MontoRetencion || 0);
      acc.TotalPagar += Number(r.TotalPagar || 0);
      return acc;
    },
    { Subtotal: 0, IGV: 0, Total: 0, MontoRetencion: 0, TotalPagar: 0 }
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.cardFiltros}>
        <Text style={styles.titulo}>Reporte Dinámico de Planillas</Text>
        <TextInput label="Proyecto" value={proyecto} onChangeText={setProyecto} style={styles.input} />
        <TextInput label="Cliente" value={cliente} onChangeText={setCliente} style={styles.input} />
        <TextInput label="Moneda (ID)" value={moneda} onChangeText={setMoneda} style={styles.input} keyboardType="numeric" />
        <TextInput label="Estado (ID)" value={estado} onChangeText={setEstado} style={styles.input} keyboardType="numeric" />
        <Button mode="contained" onPress={handleBuscar} loading={loading} style={styles.button}>
          Buscar
        </Button>
        {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
      </Card>
      <Card style={styles.cardKpi}>
        <Text style={styles.kpiTitle}>KPIs</Text>
        <Text>Subtotal: {kpi.Subtotal.toFixed(2)}</Text>
        <Text>IGV: {kpi.IGV.toFixed(2)}</Text>
        <Text>Total: {kpi.Total.toFixed(2)}</Text>
        <Text>Monto Retención: {kpi.MontoRetencion.toFixed(2)}</Text>
        <Text>Total a Pagar: {kpi.TotalPagar.toFixed(2)}</Text>
      </Card>
      <Card style={styles.cardResultados}>
        <Text style={styles.resultadosTitle}>Resultados</Text>
        {loading ? (
          <ActivityIndicator animating size="large" style={{ marginVertical: 16 }} />
        ) : (
          <DataTable>
            <DataTable.Header>
              {resultados[0] && Object.keys(resultados[0]).map((col) => (
                <DataTable.Title key={col}>{col}</DataTable.Title>
              ))}
            </DataTable.Header>
            {resultados.map((row, idx) => (
              <DataTable.Row key={idx}>
                {Object.values(row).map((val, i) => (
                  <DataTable.Cell key={i}>{asText(val)}</DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  cardFiltros: { margin: 12, padding: 16 },
  cardKpi: { margin: 12, padding: 16, backgroundColor: '#e3f2fd' },
  cardResultados: { margin: 12, padding: 16 },
  titulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  kpiTitle: { fontWeight: 'bold', marginBottom: 8 },
  resultadosTitle: { fontWeight: 'bold', marginBottom: 8 },
  input: { marginBottom: 8 },
  button: { marginTop: 8 },
});
