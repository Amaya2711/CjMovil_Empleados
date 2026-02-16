import React, { useContext, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Linking, Alert } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { UserContext } from '../context/UserContext';
import * as Location from 'expo-location';

const SEGMENTS = 8;

export default function MainMenuScreen({ navigation }) {
  const { nombreEmpleado } = useContext(UserContext);
  const [validatingAsistencia, setValidatingAsistencia] = useState(false);

  const openLocationSettings = async () => {
    if (Platform.OS === 'android') {
      Alert.alert(
        'Activar ubicación',
        'Elija una opción para activar la ubicación en su móvil.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ubicación del dispositivo',
            onPress: async () => {
              try {
                await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                return;
              } catch (e) {
                const intentUrl = 'intent:#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end';
                try {
                  await Linking.openURL(intentUrl);
                  return;
                } catch (err) {
                  await Linking.openSettings();
                }
              }
            }
          },
          {
            text: 'Permisos de la app',
            onPress: async () => {
              await Linking.openSettings();
            }
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Activar ubicación',
      'Se abrirá Configuración para habilitar Ubicación de esta app en iOS.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir configuración',
          onPress: async () => {
            await Linking.openSettings();
          }
        },
      ]
    );
  };

  const handleAsistenciaPress = async () => {
    if (validatingAsistencia) return;
    setValidatingAsistencia(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Ubicación desactivada',
          'No tienes la opción de UBICACIÓN activa. Actívala para ingresar a Asistencia.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir configuración', onPress: () => openLocationSettings() },
          ]
        );
        return;
      }

      const currentPermissions = await Location.getForegroundPermissionsAsync();
      let permissionStatus = currentPermissions?.status;
      if (permissionStatus !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        permissionStatus = requested?.status;
      }

      if (permissionStatus !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Para usar Asistencia debe permitir la ubicación para esta aplicación.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir configuración', onPress: () => openLocationSettings() },
          ]
        );
        return;
      }

      navigation.navigate('ViewAsistencia');
    } catch (e) {
      Alert.alert('Error', 'No se pudo validar la ubicación. Intente nuevamente.');
    } finally {
      setValidatingAsistencia(false);
    }
  };

  const handleLogout = () => {
    navigation.replace('Login');
  };
  const OPTIONS = [
    { label: 'Reporte', onPress: () => { console.log('Botón Reporte presionado.'); navigation.navigate('ReportePagos'); } },
    { label: 'Asistencia', onPress: handleAsistenciaPress },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.bienvenida}>Bienvenido, {String(nombreEmpleado)}</Text>
      <View style={styles.grid}>
        {OPTIONS.slice(0, SEGMENTS).map((opt, idx) => (
          <View key={idx} style={styles.segment}>
            <Button
              mode="contained"
              onPress={opt.onPress}
              style={styles.menuButton}
              disabled={opt.label !== 'Asistencia'}
            >
              {opt.label}
            </Button>
          </View>
        ))}
      </View>
      <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton}>
        Salir / Cerrar sesión
      </Button>
    </View>
  );
}

const numColumns = 2;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6fa' },
  bienvenida: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#231F36' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  segment: {
    width: Dimensions.get('window').width / numColumns - 32,
    marginBottom: 16,
    alignItems: 'center',
  },
  menuButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#7B3FF2',
  },
  logoutButton: {
    marginTop: 16,
    alignSelf: 'center',
    width: '60%',
  },
});
