# Guía de Instalación y Ejecución

## 1. Backend (Node.js + Express + SQL Server)

### Requisitos
- Node.js 18+
- Acceso a SQL Server

### Pasos
1. Copia `.env.example` a `.env` y completa los valores reales.
2. Instala dependencias:
   ```bash
   cd backend
   npm install
   ```
3. Ejecuta en desarrollo:
   ```bash
   npm run dev
   ```
4. El backend quedará disponible en `http://localhost:4000`

### Despliegue en la nube
- Azure App Service, AWS Elastic Beanstalk, Railway, Render.
- Configura variables de entorno en el panel de la plataforma.
- Asegura que el puerto y CORS estén correctamente configurados.

## 2. App Móvil (React Native + Expo)

### Requisitos
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Emulador Android/iOS o dispositivo real con Expo Go

### Pasos
1. Instala dependencias:
   ```bash
   cd mobile-app
   npm install
   ```
2. Configura la URL del backend antes de iniciar Expo:
   ```bash
   # PowerShell (Windows)
   $env:EXPO_PUBLIC_API_BASE_URL="https://TU-BACKEND-API"
   ```
   Ejemplos en desarrollo local:
   - Android emulador: `http://10.0.2.2:4000`
   - iOS simulador / Web: `http://localhost:4000`
3. Inicia el proyecto:
   ```bash
   npx expo start
   ```
4. Escanea el QR con Expo Go o usa emulador.

### Pruebas
- **Localhost:** Si pruebas en dispositivo real, expón el backend usando [ngrok](https://ngrok.com/) o similar:
  ```bash
  ngrok http 4000
  ```
  Usa la URL pública de ngrok en la app móvil.
- **Emulador:** Puedes usar `http://10.0.2.2:4000` (Android) o `http://localhost:4000` (iOS simulador).

## 3. Publicación
- **Backend:** Azure, AWS, Railway, Render.
- **App móvil:** Apple App Store, Google Play Store.

## 4. Acceso global
- El backend debe estar publicado en la nube y accesible por HTTPS desde cualquier ubicación.
- Configura CORS y variables de entorno correctamente.

---

Para dudas o soporte, contactar al equipo de desarrollo.
