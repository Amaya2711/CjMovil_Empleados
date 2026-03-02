import React, { useState, useContext } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { TextInput, Button, Card, Snackbar } from 'react-native-paper';

import axios from 'axios';
import { BASE_URL } from '../config';
import { UserContext } from '../context/UserContext';

// Carga segura de expo-network (no web)
let Network = null;
if (Platform.OS !== 'web') {
  Network = require('expo-network');
}


// Logo (Expo maneja web / android / ios)
const CJTelecomLogo = require('../../assets/logoCj.png');


// Construcción de la URL del backend de forma consistente
const API_PATH = '/api/auth/login';
const API_URL = `${BASE_URL}${API_PATH}`;

export default function LoginScreen({ navigation }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { setUserData } = useContext(UserContext);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(API_URL, { usuario, password });

      if (res.data?.token) {
        let ipLocal = '';
        let networkType = '';

        if (Platform.OS !== 'web' && Network) {
          try {
            ipLocal = await Network.getIpAddressAsync();
          } catch {
            ipLocal = '0.0.0.0';
          }

          try {
            const net = await Network.getNetworkStateAsync();
            networkType = net?.type || '';
          } catch {
            networkType = '';
          }
        }

        setUserData({
          cuadrilla: res.data.Cuadrilla,
          idusuario: res.data.usuario,
          nombreEmpleado: res.data.nombre,
          ipLocal,
          networkType,
          codEmp: res.data.CodEmp,
          CodVal: res.data.CodVal
        });

        navigation.replace('MainMenu');
      } else {
        setError('La URL configurada no corresponde al backend API. Verifica EXPO_PUBLIC_API_BASE_URL.');
      }
    } catch (err) {
      if (err.response) {
        setError(`Error ${err.response.status}: ${err.response.data?.message || 'Error de servidor'}`);
      } else if (err.request) {
        setError('No se pudo conectar con el servidor');
      } else {
        setError(err.message);
      }
      // No mostrar el error de Axios en consola para evitar doble mensaje
      // console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.logoContainer}>
          <Image source={CJTelecomLogo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* <Card.Title title="Iniciar Sesión" /> */}

        <Card.Content>
          <TextInput
            label="Usuario"
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            style={styles.input}
          />

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          >
            Entrar
          </Button>
        </Card.Content>
      </Card>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#231F36'
  },
  card: {
    borderRadius: 16,
    paddingVertical: 8
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  logo: {
    width: 180,
    height: 48
  },
  input: {
    marginBottom: 12
  },
  button: {
    marginTop: 8
  }
});
