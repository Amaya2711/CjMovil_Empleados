import axios from 'axios';

// SharePoint configuration
const SHAREPOINT_SITE_URL = 'https://cjtelecom.sharepoint.com/sites/CJ-PROYECTOS';
const SHAREPOINT_FOLDER_PATH = '/sites/CJ-PROYECTOS/APLICATIVOS EXTERNOS/ASISTENCIA';

// Note: You need to configure SharePoint authentication credentials
// Options:
// 1. Using client credentials (OAuth 2.0)
// 2. Using Azure AD tokens
// 3. Using SharePoint app-only tokens

// For this implementation, we'll use the PnP JS approach or direct REST API
// You'll need to set these environment variables:
// SHAREPOINT_CLIENT_ID
// SHAREPOINT_CLIENT_SECRET
// SHAREPOINT_TENANT_ID

/**
 * Get SharePoint access token using client credentials flow
 * Requires Azure AD app registration with SharePoint permissions
 */
const getAccessToken = async () => {
  try {
    const clientId = process.env.SHAREPOINT_CLIENT_ID;
    const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;
    const tenantId = process.env.SHAREPOINT_TENANT_ID;

    console.log('[getAccessToken] Iniciando autenticación con SharePoint...');
    console.log('[getAccessToken] TenantId configurado:', tenantId ? 'SI' : 'NO');
    console.log('[getAccessToken] ClientId configurado:', clientId ? 'SI' : 'NO');
    console.log('[getAccessToken] ClientSecret configurado:', clientSecret ? 'SI' : 'NO');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error('SharePoint authentication credentials not configured');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    console.log('[getAccessToken] Solicitando token a:', tokenUrl);
    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    console.log('[getAccessToken] Token obtenido exitosamente');
    return response.data.access_token;
  } catch (error) {
    console.error('[getAccessToken] Error completo:', error.response?.data || error.message);
    throw new Error(`Failed to get SharePoint access token: ${error.response?.data?.error_description || error.message}`);
  }
};

/**
 * Upload image to SharePoint
 * @param {string} imagenBase64 - Base64 encoded image
 * @param {string} nombreImagen - File name
 * @returns {Promise<Object>} Upload result
 */
export const uploadImageToSharePoint = async (imagenBase64, nombreImagen) => {
  try {
    console.log('[uploadImageToSharePoint] Iniciando carga de archivo:', nombreImagen);
    console.log('[uploadImageToSharePoint] Tamaño de imagen (base64):', imagenBase64?.length || 0, 'caracteres');
    
    if (!imagenBase64 || !nombreImagen) {
      throw new Error('Image data and name are required');
    }

    const token = await getAccessToken();

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imagenBase64, 'base64');
    console.log('[uploadImageToSharePoint] Buffer creado, tamaño:', imageBuffer.length, 'bytes');

    // SharePoint REST API endpoint to upload file usando Microsoft Graph API
    const driveUrl = `https://graph.microsoft.com/v1.0/sites/cjtelecom.sharepoint.com:/sites/CJ-PROYECTOS:/drive/root:/APLICATIVOS%20EXTERNOS/ASISTENCIA/${encodeURIComponent(nombreImagen)}:/content`;
    
    console.log('[uploadImageToSharePoint] URL de carga:', driveUrl);

    const response = await axios.put(driveUrl, imageBuffer, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'image/jpeg',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    console.log('[uploadImageToSharePoint] Success:', {
      fileName: nombreImagen,
      webUrl: response.data.webUrl,
      id: response.data.id,
    });

    return {
      success: true,
      fileUrl: response.data.webUrl,
      fileName: nombreImagen,
      fileId: response.data.id,
    };
  } catch (error) {
    console.error('[uploadImageToSharePoint] Error completo:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(`Failed to upload image to SharePoint: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Upload image with error handling and fallback
 * @param {string} imagenBase64 - Base64 encoded image
 * @param {string} nombreImagen - File name
 * @returns {Promise<Object>} Upload result or fallback result
 */
export const uploadImageSafely = async (imagenBase64, nombreImagen) => {
  try {
    return await uploadImageToSharePoint(imagenBase64, nombreImagen);
  } catch (error) {
    console.warn('[uploadImageSafely] SharePoint upload failed, storing metadata:', error.message);
    // Fallback: just return metadata about the image
    // In production, you might store this in a local storage or database for later retry
    return {
      success: false,
      error: error.message,
      fileName: nombreImagen,
      message: 'Image could not be uploaded to SharePoint but attendance was recorded',
      pendingUpload: true,
    };
  }
};

