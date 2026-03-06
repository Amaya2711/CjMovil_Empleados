# Configuración de Carga de Imágenes a SharePoint

## Descripción
Las imágenes de "Comentario de ingreso" se cargan automáticamente al SharePoint en:
- **Sitio**: https://cjtelecom.sharepoint.com/sites/CJ-PROYECTOS
- **Biblioteca (Drive)**: APLICATIVOS EXTERNOS
- **Carpeta dentro de la biblioteca**: ASISTENCIA

Esto evita que los archivos se guarden en la biblioteca por defecto `Documentos compartidos`.

Adicionalmente, la ruta de la imagen subida se guarda en base de datos mediante el SP `sp_Asistencia_Marcar`, usando el parámetro:
- `@Imagen NVARCHAR(250)`

El backend toma `uploadResult.fileUrl` de SharePoint y lo envía al SP como `Imagen`.

## Pasos de Configuración

### 1. Crear Azure AD App Registration

1. Ve a [Azure Portal](https://portal.azure.com)
2. Selecciona **Azure Active Directory** → **App registrations** → **New registration**
3. Configura:
   - **Name**: "CJ Asistencia App"
   - **Supported account types**: "Accounts in this organizational directory only"
4. Click **Register**

### 2. Obtener Tenant ID

1. En la página de la aplicación, ve a **Overview**
2. Copia el valor de **Directory (tenant) ID**
3. Este es tu `SHAREPOINT_TENANT_ID`

### 3. Crear Client Secret

1. En la aplicación, ve a **Certificates & secrets**
2. Click **New client secret**
3. Configura:
   - **Description**: "SharePoint API Access"
   - **Expires**: "24 months"
4. Click **Add**
5. Copia el **Value** (aparece una sola vez)
6. Este es tu `SHAREPOINT_CLIENT_SECRET`

### 4. Obtener Client ID

1. En la página de Overview
2. Copia el valor de **Application (client) ID**
3. Este es tu `SHAREPOINT_CLIENT_ID`

### 5. Agregar Permisos de SharePoint

1. En la aplicación, ve a **API permissions**
2. Click **Add a permission**
3. Selecciona **Microsoft Graph**
4. Click **Application permissions**
5. Busca y selecciona:
   - `Sites.ReadWrite.All`
   - `Files.ReadWrite.All`
6. Click **Add permissions**
7. Click **Grant admin consent for [Organización]** (Importante: DEBE estar en verde)

**Nota importante**: Asegúrate de que el consentimiento de administrador esté otorgado (columna "Status" debe mostrar un check verde). Sin esto, la carga fallará silenciosamente.

### 6. Configurar Variables de Entorno

Actualiza tu archivo `.env` en el backend:

```env
# SharePoint Configuration
SHAREPOINT_CLIENT_ID=YOUR_CLIENT_ID_HERE
SHAREPOINT_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
SHAREPOINT_TENANT_ID=YOUR_TENANT_ID_HERE

# Biblioteca/Carpeta objetivo (opcional, recomendado para producción)
SHAREPOINT_DRIVE_NAME=APLICATIVOS EXTERNOS
SHAREPOINT_FOLDER_PATH=ASISTENCIA
```

Reemplaza `YOUR_CLIENT_ID_HERE`, `YOUR_CLIENT_SECRET_HERE`, y `YOUR_TENANT_ID_HERE` con los valores obtenidos arriba.
Si no defines `SHAREPOINT_DRIVE_NAME`, Microsoft Graph usará la biblioteca por defecto y las imágenes pueden terminar en `Documentos compartidos`.

### 7. Reiniciar el Backend

```powershell
# En la carpeta del backend
npm install  # Si es necesario reinstalar dependencias

# Ejecuta el servidor
npm start
```

## Verificación

Para verificar que funciona:

1. En la app mobile, registra un ingreso con foto
2. Verifica que el registro se guarde (aparecerá en el listado)
3. En SharePoint, navega a: https://cjtelecom.sharepoint.com/sites/CJ-PROYECTOS/APLICATIVOS EXTERNOS/ASISTENCIA
4. Deberías ver los archivos de imagen con nombres como: `INGRESO_<codEmp>_<timestamp>.jpg`
5. En SQL, valida que el registro de asistencia del día tenga la URL en la columna `Imagen`.

## Solución de Problemas

### Error: "SharePoint authentication credentials not configured"
- Asegúrate de que las variables de entorno estén configuradas en `.env`
- Reinicia el servidor después de configurar las variables

### Error: "Failed to get SharePoint access token"
- Verifica que Client ID y Client Secret sean correctos
- Asegúrate de que se haya otorgado consentimiento de admin para los permisos
- Verifica que el Tenant ID sea correcto

### Error: "Failed to upload image to SharePoint"
- Verifica que la carpeta ASISTENCIA existe en /sites/CJ-PROYECTOS/APLICATIVOS EXTERNOS
- Si no exists, créala manualmente en SharePoint
- Asegúrate de que el app tenga permisos de escritura en esa carpeta

## Fallback en Caso de Fallo

Si la carga a SharePoint falla por cualquier razón:
- El registro de asistencia se completará de todas formas
- La respuesta incluirá un campo `imageUpload` con el estado del upload
- En la app mobile, el usuario verá un mensaje indicando que el registro se guardó aunque la foto no se subió

## Notas de Seguridad

- **NUNCA** compartas el `SHAREPOINT_CLIENT_SECRET` públicamente
- El `SHAREPOINT_CLIENT_SECRET` se usa solo en el servidor backend
- Las imágenes se almacenan en base64 en tránsito, considera usar HTTPS en producción
- Los nombres de archivo incluyen timestamp para evitar conflictos
