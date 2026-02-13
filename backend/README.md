# Backend API — Node.js + Express + SQL Server

## Instalación

1. Copia `.env.example` a `.env` y completa los valores reales.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Ejecuta en desarrollo:
   ```bash
   npm run dev
   ```

## Despliegue recomendado
- Azure App Service
- AWS Elastic Beanstalk
- Railway / Render

## Seguridad
- Nunca expongas datos de conexión en el frontend.
- Usa JWT para autenticación.
- Maneja errores y respuestas controladas.
