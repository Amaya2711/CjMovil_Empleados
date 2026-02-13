import 'react-native-get-random-values';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Font from 'expo-font';
import { AppState, Platform, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import 'react-native-gesture-handler';
// Eliminado hack de modificación de fuente para compatibilidad con React Native moderno
import { CommonActions, NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme, Button } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';

import LoginScreen from './src/screens/LoginScreen';
import MainMenuScreen from './src/screens/MainMenuScreen';
import AprobarPagosScreen from './src/screens/AprobarPagosScreen';
import ReAprobarPagosScreen from './src/screens/ReAprobarPagosScreen';
import { UserContext, UserProvider } from './src/context/UserContext';

const INACTIVITY_MS = 5 * 60 * 1000;

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#7B3FF2', // Morado
    accent: '#2BB8F7', // Azul
    background: '#231F36', // Fondo oscuro
    surface: '#2B2542', // Un poco más claro para tarjetas
    text: '#FFFFFF', // Blanco
    placeholder: '#B0AFC7', // Gris claro para placeholder
    error: '#FF8C3B', // Naranja
  },
};

function AppContent() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const { setUserData } = useContext(UserContext);
  const inactivityTimerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const backgroundSinceRef = useRef(null);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const clearUserSession = useCallback(() => {
    setUserData({
      cuadrilla: null,
      idusuario: null,
      nombreEmpleado: '',
      ipLocal: null,
      networkType: null,
      codEmp: null,
      CodVal: null,
    });
  }, [setUserData]);

  const handleAutoLogout = useCallback(() => {
    clearInactivityTimer();
    clearUserSession();
    if (!navigationRef.isReady()) return;
    const currentRoute = navigationRef.getCurrentRoute();
    if (currentRoute?.name === 'Login') return;
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }, [clearInactivityTimer, clearUserSession, navigationRef]);

  const resetInactivityTimer = useCallback(() => {
    if (!fontsLoaded) return;
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, INACTIVITY_MS);
  }, [clearInactivityTimer, fontsLoaded, handleAutoLogout]);

  useEffect(() => {
    async function loadFonts() {
      try {
            // No cargar la fuente manualmente, Expo la gestiona automáticamente
        setFontsLoaded(true);
      } catch (err) {
        console.error('Error cargando fuentes:', err);
      }
    }
    loadFonts();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    resetInactivityTimer();
    return () => {
      clearInactivityTimer();
    };
  }, [clearInactivityTimer, fontsLoaded, resetInactivityTimer]);

  useEffect(() => {
    if (!fontsLoaded) return;
    const subscription = AppState.addEventListener('change', nextAppState => {
      const wasInBackground = appStateRef.current.match(/inactive|background/);
      const isNowActive = nextAppState === 'active';

      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        backgroundSinceRef.current = Date.now();
      }

      if (wasInBackground && isNowActive) {
        const backgroundTime = backgroundSinceRef.current ? Date.now() - backgroundSinceRef.current : 0;
        if (backgroundTime >= INACTIVITY_MS) {
          handleAutoLogout();
          appStateRef.current = nextAppState;
          return;
        }
        resetInactivityTimer();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fontsLoaded, handleAutoLogout, resetInactivityTimer]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#231F36' }}>
        <Text style={{ color: '#7B3FF2', fontSize: 20, marginBottom: 16 }}>Cargando recursos...</Text>
        <Button loading={true} mode="contained" style={{ backgroundColor: '#7B3FF2' }}>
          Cargando
        </Button>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <View style={{ flex: 1 }} onTouchStart={resetInactivityTimer}>
        <NavigationContainer ref={navigationRef} onStateChange={resetInactivityTimer}>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
