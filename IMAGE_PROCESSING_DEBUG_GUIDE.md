# Image Processing Error Debugging Guide

## Overview
The image processing functions in `ViewAsistencia.js` have been enhanced with comprehensive console logging to help diagnose image conversion and processing failures. This guide explains what each log message means and how to interpret them.

## Complete Processing Flow

When a user captures or selects a photo for attendance, the app follows this sequence:

```
1. tomarFotoIngreso / seleccionarImagenIngreso  (capture/select)
   ↓
2. Photo stored in ingresoFoto state
   ↓
3. confirmIngresoRegister  (submit)
   ↓
4. convertImageToBase64  (main conversion)
   ├─ Copy content:// to cache (Android)
   ├─ redimensionarImagen  (resize)
   └─ Read as Base64
   ↓
5. executeRegister  (send to backend)
```

---

## Metro Console Log Sections

### 1. Photo Capture/Selection Logs

#### Taking a Photo
```
[tomarFotoIngreso] Solicitando permiso de cámara...
[tomarFotoIngreso] Estado permiso cámara: granted
[tomarFotoIngreso] Abriendo cámara...
[tomarFotoIngreso] Resultado cámara: {"canceled":false,"assetsLength":1}
[tomarFotoIngreso] ✓ Foto capturada exitosamente: {
  uri: "file:///data/user/0/com.example.app/cache/IMG_12345.jpg",
  width: 4032,
  height: 2268,
  type: "image",
  fileName: "IMG_12345.jpg"
}
```

**What it means:**
- ✓ = Success
- Camera permission was granted
- Photo asset includes URI, dimensions, and filename
- URI can be `file://` (local) or `content://` (Android media access)

#### Selecting from Gallery
```
[seleccionarImagenIngreso] Solicitando permiso de librería de medios...
[seleccionarImagenIngreso] Estado permiso galería: granted
[seleccionarImagenIngreso] Abriendo galería...
[seleccionarImagenIngreso] Resultado galería: {"canceled":false,"assetsLength":1}
[seleccionarImagenIngreso] ✓ Imagen seleccionada exitosamente: {...}
```

**Troubleshooting:**
- If `canceled: true` → User dismissed the dialog
- If `assetsLength: 0` → No image selected
- If `State permiso galería: denied` → Permission not granted (user must enable in settings)

---

### 2. Image Conversion Logs

#### Initial Asset Validation
```
[confirmIngresoRegister] ========== INICIANDO PROCESAMIENTO DE IMAGEN ==========
[confirmIngresoRegister] Foto seleccionada: {
  uri: "content://media/external/images/media/12345",
  width: 2400,
  height: 1800,
}
```

**What it means:**
- Processing started
- Asset dimensions are reported (original size before resizing)
- URI type is important:
  - `file://` = Local file (safe)
  - `content://` = Android media provider (needs special handling)

---

### 3. Content:// URI Handling (Android Only)

```
[convertImageToBase64] Platform.OS: android
[convertImageToBase64] ¿Es Android content:// ?: true
[convertImageToBase64] → Copiando content:// URI a cache para lectura...
[convertImageToBase64] → URI cache objetivo: file:///data/user/0/.../ingreso_original_1741203600000.jpg
[convertImageToBase64] ✓ COPIED to cache successfully
```

**What it means:**
- Android detected a `content://` URI (from gallery or camera)
- App copying it to app cache for reading (required on Android)
- Timestamp (1741203600000) ensures unique filenames to avoid conflicts
- ✓ = Copy succeeded

**If you see this error:**
```
[convertImageToBase64] ✗ ERROR al copiar content:// a cache: Permission denied
```
→ App doesn't have file access permission. Check in Android Settings > Apps.

---

### 4. Image Resizing/Redimensioning Logs

#### Successful Resize
```
[convertImageToBase64] → Redimensionando: {
  del: "2400x1800",
  al: "427x320",
  ratio: 1.33
}
[convertImageToBase64] → Leyendo en caché...
[redimensionarImagen] INICIO - sourceUri: file:///data/user/0/.../ingreso_original_1741203600000.jpg
[redimensionarImagen] Dimensiones objetivo: {"width":427,"height":320}
[redimensionarImagen] Llamando ImageManipulator.manipulateAsync...
[redimensionarImagen] ✓ ÉXITO - URI redimensionada: file:///data/user/0/.../resized_1741203600001.jpg
```

**What it means:**
- Original: 2400x1800px
- Target: 427x320px (maintains aspect ratio)
- compress: 0.35 = JPEG quality 35% (small file)
- ✓ = Resize successful

#### Resize Failure
```
[redimensionarImagen] ✗ ERROR: ENOMEM (out of memory)
[redimensionarImagen] Stack: at ImageManipulator.manipulateAsync...
```

**Troubleshooting:**
- Too large original image → Out of memory
- Solution: Device is low on RAM, try closing other apps
- Or: Take a screenshot instead of full photo (screenshot is typically smaller)

#### Content:// URI from Resize
```
[convertImageToBase64] ✓ Redimensionamiento exitoso: content://some/path
[convertImageToBase64] ⚠ ALERTA: redimensionada es content://, copiando a cache...
[convertImageToBase64] ✓ Copiada a cache: file:///data/user/0/.../ingreso_resized_1741203600002.jpg
```

**What it means:**
- Resize produced a `content://` URI (unexpected but handled)
- App detects this and copies to cache
- Now safe to read as Base64
- ⚠ = Warning but recoverable

---

### 5. Base64 Encoding Logs

#### Successful Encoding
```
[convertImageToBase64] → Leyendo Base64 desde: file:///data/user/0/.../ingreso_resized_1741203600002.jpg
[convertImageToBase64] → Info del archivo: {
  exists: true,
  isDirectory: false,
  size: 28945,
  modificationTime: 1741203600000
}
[convertImageToBase64] → Leyendo contenido como Base64...
[convertImageToBase64] ✓ Base64 leído exitosamente
[convertImageToBase64] Tamaño Base64: 38593 caracteres
[confirmIngresoRegister] ✓ Imagen convertida a base64 - Tamaño: 28.98 KB (~0.03MB)
```

**What it means:**
- File exists and is readable
- File size: 28.9 KB (well under 700 KB limit)
- Base64 = 38,593 characters (roughly 4/3 of binary size)
- ✓ = Encoding successful
- Size in KB is calculated as: (base64_chars × 0.75) / 1024

#### Encoding Failure - File Not Found
```
[convertImageToBase64] → Info del archivo: {
  exists: false,
  isDirectory: false,
  size: null,
  modificationTime: null
}
[convertImageToBase64] ✗ ERROR al leer Base64: El archivo no existe
```

**Causes:**
1. File was deleted by OS or app
2. App cache directory changed
3. File permissions revoked

**Solution:** Try photos again - this is usually a temporary device issue.

#### Encoding Failure - Reading Error
```
[convertImageToBase64] → Leyendo Base64 desde: file:///path/to/file.jpg
[convertImageToBase64] ✗ ERROR al leer Base64: EACCES: permission denied
[convertImageToBase64] Stack: at FileSystem.readAsStringAsync...
```

**Cause:** App lost permission to read file mid-process

**Solution:** Restart app and try again

---

### 6. Image Size Validation Logs

#### Under Limit (Success)
```
[confirmIngresoRegister] ✓ Imagen convertida a base64 - Tamaño: 45.23 KB (~0.05MB)
[confirmIngresoRegister] Nombre de imagen asignado: INGRESO_EMP001_2026_03_05.jpg
```

**What it means:** Image is within 700 KB limit, safe to send

#### Over Limit (Rejection)
```
[confirmIngresoRegister] ✗ RECHAZO: Imagen muy grande (850.00KB > 700KB)
Mensaje usuario: La imagen excede el límite permitido para producción (850.00KB)...
```

**Solution:** Take a closer photo or use a higher compression device setting

---

### 7. Cleanup Logs

#### Successful Cleanup
```
[convertImageToBase64] → Limpiando archivos temporales...
[convertImageToBase64] ✓ Eliminado: tempOriginalUri
[convertImageToBase64] ✓ Eliminado: redimensionadaUri (si es temp)
[convertImageToBase64] ========== CONVERSIÓN COMPLETADA EXITOSAMENTE ==========
```

**What it means:** All temporary files deleted, process complete

#### Cleanup Warnings
```
[convertImageToBase64] ⚠ No se pudo eliminar: tempOriginalUri, ENOENT: no such file or directory
```

**Means:** File was already deleted or missing, not a critical issue (idempotent flag handles this)

---

### 8. Complete Error Section

#### Network/Registration Error Example
```
[confirmIngresoRegister] ========== PROCESAMIENTO DE IMAGEN COMPLETADO ==========
[confirmIngresoRegister] ========== INICIANDO CONVERSIÓN DE IMAGEN ==========
... [successful image logs] ...
[executeRegister][ERROR_DETAIL] {
  tipo: "INGRESO",
  errorDetails: "Error de conexión al servidor"
}
```

**What it means:** Image processed successfully but registration failed (backend issue)

#### Specific Conversion Error Example
```
[convertImageToBase64] ========== ERROR EN PROCESAMIENTO DE IMAGEN ==========
[convertImageToBase64] ✗ Error: Redimensionamiento fallido: ENOMEM
[convertImageToBase64] Stack trace: at ImageManipulator.manipulateAsync...
[convertImageToBase64] Error completo: {...}
[convertImageToBase64] Type: Error
[convertImageToBase64] Constructor: Error
Mensaje usuario: Error al procesar la imagen. Problema al redimensionar. Intente una foto diferente.
```

**What it means:** Image resize failed (out of memory), user informed

---

## Common Scenarios & Solutions

### Scenario 1: Screenshot Instead of Camera Photo
**Symptoms:**
- User took screenshot (from screenshot button)
- Logs show 1080x1920 or similar screen resolution
- Redimensioning fails with memory error

**Why:**
- Screenshots are uncompressed and very large
- Resizing them consumes massive RAM
- Device runs out of memory

**Solution for Users:**
- Use camera app, not screenshot
- Take actual photo of document/scene
- Close other apps and try again

---

### Scenario 2: Gallery Image from Cloud Service (Google Photos, OneDrive)
**Symptoms:**
- URI is `content://com.google.android.gms.chimera...`
- Copy to cache succeeds
- But file corrupted or incomplete

**Why:**
- Cloud photos stream on-demand
- Sometimes connection drops during copy
- Partial file can't be processed

**Solution:**
- Download photo locally first
- Use offline gallery app
- Or take new photo with camera

---

### Scenario 3: Device Out of Storage
**Symptoms:**
- Copy to cache fails: `ENOSPC: no space left on device`
- Or resize fails with ENOMEM

**Why:**
- Device storage full
- Cache directory has no space

**Solution:**
- Clear app cache: Settings > Apps > App > Storage > Clear Cache
- Delete unnecessary files
- Restart device

---

### Scenario 4: Android 6-7 Permissions
**Symptoms:**
- Logs show `android` platform
- Permission status shows `denied`
- Never shows photo picker

**Why:**
- Android 6+ requires runtime permissions
- User denied in permission dialog
- First app startup

**Solution:**
- User grants permission in permission dialog
- If already denied: Settings > Apps > YourApp > Permissions > Camera/Storage

---

## Debugging Tips

### Enable Debug Logs
1. Open Metro console (where `npm start` runs)
2. Look for lines starting with `[tomarFotoIngreso]`, `[convertImageToBase64]`, etc.
3. They appear as user interacts with app

### Clear Filter
If too many logs, filter by function name:
```
Ctrl+F (in Metro) → "[convertImageToBase64]"
```

### Check Full Asset Object
Look for complete asset logs like:
```
[confirmIngresoRegister] Foto seleccionada: {
  uri: ...,       ← HERE
  width: ...,     ← Original dimensions
  height: ...,
}
```

### Trace File Paths
Each temp file has unique timestamp:
- Original copy: `ingreso_original_1741203600000.jpg`
- Resized: `ingreso_resized_1741203600001.jpg`
- Different timestamps = different files (good!)

---

## What to Report If Still Broken

If error persists, collect:

1. **Exact error message** shown to user
2. **Metro console logs** from capture to error (copy full section)
3. **Device info:**
   - Android version (Settings > About)
   - Device model
   - Available storage
4. **Photo source:**
   - Camera app or gallery?
   - Screenshot, regular photo, or document?
   - Estimated original size
5. **Reproducibility:**
   - Every photo fails?
   - Only certain types?

---

## Key Error Code Meanings

| Error | Meaning | Solution |
|-------|---------|----------|
| `ENOMEM` | Out of memory | Close apps, restart device |
| `EACCES` | Permission denied | Grant permissions in settings |
| `ENOENT` | File not found | Restart app, try again |
| `ENOSPC` | No space on device | Clear cache/storage |
| `Permission denied` | File access blocked | Check app permissions |
| `content:// URI` | Sandbox access | App copies to cache (automatic) |
| `Base64 vacío` | Empty encoding | File damaged or access issue |

---

## Related Files

- Main component: [mobile-app-fresh/src/screens/ViewAsistencia.js](mobile-app-fresh/src/screens/ViewAsistencia.js)
- Image functions: Lines ~550-750 (redimensionarImagen, convertImageToBase64)
- Photo capture: Lines ~825-865
- Photo selection: Lines ~867-906
- Submit handler: Lines ~908-999

