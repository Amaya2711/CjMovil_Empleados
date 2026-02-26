import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import AprobarPagosScreen from '../screens/AprobarPagosScreen';
import ReAprobarPagosScreen from '../screens/ReAprobarPagosScreen';
import ReAprobarHormigasScreen from '../screens/ReAprobarHormigas';
import ReportePlanillaScreen from '../screens/ReportePlanillaScreen';
import ReportePagosScreen from '../screens/ReportePagos';
import DetallePagosScreen from '../screens/DetallePagos';
import AsistenciaScreen from '../screens/Asistencia';
import OcScreen from '../screens/Oc';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Iniciar Sesión' }} />
      <Stack.Screen name="MainMenu" component={MainMenuScreen} options={{ title: 'Menú Principal' }} />
      <Stack.Screen name="AprobarPagos" component={AprobarPagosScreen} options={{ title: 'Aprobar Hormigas' }} />
      <Stack.Screen name="ReAprobarPagos" component={ReAprobarPagosScreen} />
      <Stack.Screen name="ReAprobarHormigas" component={ReAprobarHormigasScreen} options={{ title: 'Re-Aprobar Hormigas' }} />
      <Stack.Screen
        name="ReportePlanilla"
        component={ReportePlanillaScreen}
        options={{ title: 'Reporte Dinámico de Planillas' }}
      />
      <Stack.Screen name="ReportePagos" component={ReportePagosScreen} options={{ title: 'Reporte de Gastos' }} />
      <Stack.Screen name="DetallePagos" component={DetallePagosScreen} options={{ title: 'Detalle de Pagos' }} />
      <Stack.Screen name="Asistencia" component={AsistenciaScreen} options={{ title: 'Asistencia' }} />
      <Stack.Screen name="Oc" component={OcScreen} options={{ title: 'Orden Compra' }} />
    </Stack.Navigator>
  );
}
