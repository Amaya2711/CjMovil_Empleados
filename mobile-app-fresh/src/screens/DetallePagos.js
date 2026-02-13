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
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, DataTable, Button } from 'react-native-paper';
import { getDetallePagos } from '../api/DetallePagos';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DetallePagosScreen({ route }) {
  const { proyecto, anos } = route.params || {};
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandido, setExpandido] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Si se reciben varios años, pásalos al backend como arreglo o string separado por comas
        const anosParam = Array.isArray(anos) ? anos : (anos ? [anos] : []);
        const res = await getDetallePagos({ proyecto, anos: anosParam, page, pageSize });
        if (res.error) throw new Error(res.message);
        setData(res.result || []);
        setTotal(res.total || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [proyecto, JSON.stringify(anos), page, pageSize]);

  // ...existing code...

  const columnas = data[0] ? Object.keys(data[0]) : [];

  const toggleExpandido = (id) => {
    setExpandido(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.container}>
      <Card style={[styles.cardResultados, { flex: 1 }]}> {/* Asegura que el Card ocupe todo el espacio disponible */}
        {/* Botones Anterior y Siguiente en la cabecera */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
          {Math.ceil(total / pageSize) > 2 && (
            <Button
              mode="outlined"
              onPress={() => setPage(1)}
              disabled={page === 1}
              style={{ marginHorizontal: 2, minWidth: 32, height: 32, padding: 0, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
              icon="page-first"
              compact={true}
              accessibilityLabel="Primera página"
            />
          )}
          <Button
            mode="outlined"
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ marginHorizontal: 2, minWidth: 32, height: 32, padding: 0, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
            icon="chevron-left"
            compact={true}
            accessibilityLabel="Anterior"
          />
          <Text style={{ marginHorizontal: 8 }}>
            Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
          </Text>
          <Button
            mode="outlined"
            onPress={() => setPage(p => (p < Math.ceil(total / pageSize) ? p + 1 : p))}
            disabled={page >= Math.ceil(total / pageSize)}
            style={{ marginHorizontal: 2, minWidth: 32, height: 32, padding: 0, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
            icon="chevron-right"
            compact={true}
            accessibilityLabel="Siguiente"
          />
          {Math.ceil(total / pageSize) > 2 && (
            <Button
              mode="outlined"
              onPress={() => setPage(Math.ceil(total / pageSize))}
              disabled={page >= Math.ceil(total / pageSize)}
              style={{ marginHorizontal: 2, minWidth: 32, height: 32, padding: 0, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
              icon="page-last"
              compact={true}
              accessibilityLabel="Última página"
            />
          )}
        </View>
        {loading ? (
          <ActivityIndicator animating size="large" style={{ marginVertical: 16 }} />
        ) : error ? (
          <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={data}
              keyExtractor={(item, idx) => String(item.Corre || idx)}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const uniqueId = String(item.Corre);
                return (
                  <Card style={{ marginBottom: 12, padding: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: '#888', fontWeight: 'bold', marginLeft: 2 }}>Nro: {asText(item.Corre)}</Text>
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
                        {/* <Button
                          mode="text"
                          onPress={() => {}}
                          compact={true}
                          style={{ minWidth: 80, height: 32, borderRadius: 16, paddingVertical: 0, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 0, backgroundColor: 'transparent' }}
                          labelStyle={{ color: '#2196F3', fontSize: 12, lineHeight: 15, fontWeight: 'bold' }}
                        >
                          Datos OC
                        </Button> */}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#7B3FF2', marginRight: 4 }}>Fecha:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.FecIngreso)}</Text>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#7B3FF2', marginLeft: 12, marginRight: 4 }}>Total:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Total)} {asText(item.Moneda)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#7B3FF2', marginRight: 4 }}>Sol.:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Solicitante)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#7B3FF2', marginRight: 4 }}>Responsable:</Text>
                      <Text style={{ fontSize: 13 }}>{asText(item.Responsable)}</Text>
                    </View>
                    {/* Detalle solo visible si está expandido */}
                    {expandido[uniqueId] && item.Detalle && (
                      <View style={{ marginTop: 2 }}>
                        <Text style={{ fontSize: 13, color: '#333' }}>{asText(item.Detalle)}</Text>
                      </View>
                    )}
                    {expandido[uniqueId] && (
                      <View style={{ marginTop: 8, backgroundColor: '#f3f3f3', borderRadius: 8, padding: 8 }}>
                        {/* Campos adicionales, puedes personalizar los que quieras mostrar */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#7B3FF2' }}>Comprobante: </Text>
                          <Text style={{ color: '#333' }}>{asText(item.Comprobante)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#7B3FF2' }}>RUC: </Text>
                          <Text style={{ color: '#333' }}>{asText(item.RUC)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#7B3FF2' }}>TipoPago: </Text>
                          <Text style={{ color: '#333' }}>{asText(item.TipoPago)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#7B3FF2' }}>Observación: </Text>
                          <Text style={{ color: '#333' }}>{asText(item.Observacion)}</Text>
                        </View>
                        {/* Agrega más campos según lo que desees mostrar */}
                      </View>
                    )}
                  </Card>
                );
              }}
              ListFooterComponent={
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <Text style={{ marginHorizontal: 8 }}>
                    Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  cardResultados: { margin: 12, padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 8, fontSize: 18 },
});
