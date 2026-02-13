
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { Menu, Button } from 'react-native-paper';

export default function DropdownSolicitante({ data, value, onChange }) {
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(false);

  // Filtrar por NombreEmpleado según lo que se digite
  const filteredList = useMemo(() => {
    // Solo incluir los que tengan NombreEmpleado válido y sea string
    const validData = Array.isArray(data) ? data.filter(item => typeof item.NombreEmpleado === 'string' && item.NombreEmpleado.trim() !== '') : [];
    if (!search) return validData;
    return validData.filter(item => item.NombreEmpleado.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const selectedLabel = Array.isArray(data) ? data.find(item => item.IdEmpleado === value)?.NombreEmpleado || '' : '';

  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Buscar solicitante..."
        value={search}
        onChangeText={setSearch}
        onFocus={() => setVisible(true)}
      />
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setVisible(true)} style={styles.dropdownButton}>
            <Text>{selectedLabel || 'Seleccione un solicitante'}</Text>
          </Button>
        }
        style={{ width: '100%' }}
      >
        {filteredList.length === 0 && (
          <Menu.Item title="Sin resultados" disabled />
        )}
        {filteredList.map((item, idx) => (
          <Menu.Item
            key={`${item.IdEmpleado}_${item.NombreEmpleado}_${idx}`}
            title={item.NombreEmpleado}
            onPress={() => {
              onChange(item.IdEmpleado);
              setVisible(false);
              setSearch('');
            }}
          />
        ))}
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  dropdownButton: {
    width: '100%',
    justifyContent: 'flex-start',
    borderRadius: 6,
  },
});




