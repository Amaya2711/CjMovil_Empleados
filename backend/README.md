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

## Asistencia y SP

- Endpoint: `POST /api/asistencia/register`
- SP utilizado: `sp_Asistencia_Marcar`
- Parámetro nuevo: `@Imagen NVARCHAR(250) = NULL`

Flujo actual del endpoint:
1. Si llega `imagenBase64`, se sube primero a SharePoint.
2. Si la subida es exitosa, la URL pública (`fileUrl`) se envía al SP en el parámetro `Imagen`.
3. Si la subida falla, el registro de asistencia se mantiene y `Imagen` se envía en `NULL`.
