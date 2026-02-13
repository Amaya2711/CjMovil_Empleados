import React from 'react';
import { View } from 'react-native';
import { Checkbox, Text } from 'react-native-paper';

export default function AnoMultiSelect({ anos, seleccionados, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
      {anos.map(ano => (
        <View key={ano} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
          <Checkbox
            status={seleccionados.includes(ano) ? 'checked' : 'unchecked'}
            onPress={() => {
              if (seleccionados.includes(ano)) {
                onChange(seleccionados.filter(a => a !== ano));
              } else {
                onChange([...seleccionados, ano]);
              }
            }}
          />
          <Text>{ano}</Text>
        </View>
      ))}
    </View>
  );
}
