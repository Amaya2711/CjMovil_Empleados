import React from 'react';
import { View } from 'react-native';
import { Text, RadioButton } from 'react-native-paper';

export default function AnoSelect({ anos, seleccionado, onChange }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
      <Text style={{ marginRight: 8 }}>Año:</Text>
      <RadioButton.Group onValueChange={onChange} value={seleccionado}>
        {anos.map(ano => (
          <View key={ano} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <RadioButton value={ano} />
            <Text>{ano}</Text>
          </View>
        ))}
      </RadioButton.Group>
    </View>
  );
}
