import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import AprobarPagosScreen from '../screens/AprobarPagosScreen';
import ReAprobarPagosScreen from '../screens/ReAprobarPagosScreen';
import ReportePlanillaScreen from '../screens/ReportePlanillaScreen';
import ReportePagosScreen from '../screens/ReportePagos';
import ViewAsistencia from '../screens/ViewAsistencia';
import DetallePagosScreen from '../screens/DetallePagos';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión' }} />
      <Stack.Screen name="MainMenu" component={MainMenuScreen} options={{ title: 'Menú Principal' }} />
      <Stack.Screen name="AprobarPagos" component={AprobarPagosScreen} options={{ title: 'Aprobar Pagos' }} />
      <Stack.Screen name="ReAprobarPagos" component={ReAprobarPagosScreen} />
      <Stack.Screen
        name="ReportePlanilla"
        component={ReportePlanillaScreen}
        options={{ title: 'Reporte Dinámico de Planillas' }}
      />
      <Stack.Screen name="ReportePagos" component={ReportePagosScreen} options={{ title: 'Reporte de Gastos' }} />
      <Stack.Screen name="DetallePagos" component={DetallePagosScreen} options={{ title: 'Detalle de Pagos' }} />
      <Stack.Screen name="ViewAsistencia" component={ViewAsistencia} options={{ title: 'Asistencia' }} />
    </Stack.Navigator>
  );
}
