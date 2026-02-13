import React from 'react';
import { View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';

export default function MonedaMultiSelect({ monedas, seleccionadas, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
      {monedas.map(moneda => (
        <View key={moneda} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
          <Checkbox
            status={seleccionadas.includes(moneda) ? 'checked' : 'unchecked'}
            onPress={() => {
              if (seleccionadas.includes(moneda)) {
                onChange(seleccionadas.filter(m => m !== moneda));
              } else {
                onChange([...seleccionadas, moneda]);
              }
            }}
          />
          <Text>{moneda}</Text>
        </View>
      ))}
    </View>
  );
}
