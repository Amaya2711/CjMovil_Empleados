# Image Processing - Quick Troubleshooting Checklist

## ⚠️ "Error al procesar la imagen. Intento con otra foto"

This error means the image conversion failed. Use this checklist to identify the cause:

### Step 1: Check Metro Console
Open the terminal where `npm start` is running and look for logs starting with `[convertImageToBase64]` or `[redimensionarImagen]`.

### Step 2: Identify the Error Type

#### 🔴 **"out of memory" / "ENOMEM"**
```
[redimensionarImagen] ✗ ERROR: ENOMEM (out of memory)
```
**Cause:** Device running low on RAM (common with large photos or screenshots)
**Fix:**
- ✅ Close background apps
- ✅ Restart device
- ✅ Take a new photo with camera (instead of screenshot)
- ✅ Use a photo with smaller resolution

**Why screenshots fail:** Screenshots are typically 1080x2340px uncompressed = huge RAM usage for resizing

---

#### 🔴 **"Permission denied" / "EACCES"**
```
[convertImageToBase64] ✗ ERROR al copiar content:// a cache: Permission denied
[convertImageToBase64] ✗ ERROR al leer Base64: EACCES: permission denied
```
**Cause:** App doesn't have file permission
**Fix:** 
- ✅ Go to **Settings** > **Apps** > Find your app > **Permissions**
- ✅ Enable **Camera** and **Storage** / **Photos & Videos**
- ✅ Restart app

---

#### 🔴 **"File not found" / "ENOENT"**
```
[convertImageToBase64] ✗ ERROR al leer Base64: El archivo no existe
```
**Cause:** File was deleted or lost (rare, usually temporary)
**Fix:**
- ✅ Restart app
- ✅ Try taking/selecting photo again

---

#### 🔴 **"No space on device" / "ENOSPC"**
```
[convertImageToBase64] ✗ ERROR: ENOSPC: no space left on device
```
**Cause:** Device storage full
**Fix:**
- ✅ Go to **Settings** > **Storage** > Delete files/photos
- ✅ Go to **Settings** > **Apps** > Your App > **Storage** > **Clear Cache**
- ✅ Restart device

---

#### 🔴 **Image Size Over 700 KB**
```
[confirmIngresoRegister] ✗ RECHAZO: Imagen muy grande (850.00KB > 700KB)
Mensaje usuario: La imagen excede el límite...
```
**Cause:** Photo file too large (physical limitation, not app error)
**Fix:**
- ✅ Take a photo closer to the subject (less detail = smaller file)
- ✅ Use phone camera quality setting: **Medium** instead of **High**
- ✅ Ensure good lighting (compressed images are smaller)
- ✅ Try gallery image instead of taking new photo

---

#### 🔴 **"Base64 vacío" / Empty Base64**
```
[convertImageToBase64] ✗ ERROR al leer Base64: Base64 string vacío
```
**Cause:** File exists but is empty/corrupted
**Fix:**
- ✅ Restart app
- ✅ Try different photo
- ✅ Clear app cache: **Settings** > **Apps** > App > **Storage** > **Clear Cache**

---

### Step 3: Check Photo Source

| Source | Success Rate | What to Do |
|--------|-------------|-----------|
| 📷 **Camera** | ✅✅✅ Highest | Recommended! Use this |
| 📸 **Screenshot** | ❌⚠️ Often fails | Avoid - too large |
| 🖼️ **Gallery (local)** | ✅✅ Good | Works, sometimes slower |
| ☁️ **Gallery (cloud)** | ⚠️ Sometimes fails | Download locally first |

---

### Step 4: Check Device Status

- **Storage:** Settings > Storage > Check free space (need at least 500MB)
- **RAM:** Close other apps (Telegram, Chrome, TikTok, etc.)
- **Permissions:** Settings > Apps > Your App > All Permissions > Camera & Photos
- **Android Version:** Settings > About > Android Version (minimum Android 8)

---

## ✅ If Photos ARE Working

You'll see in Metro:
```
[convertImageToBase64] ========== INICIO CONVERSIÓN ==========
[convertImageToBase64] URI inicial válida: file:///data/user/0/...
[redimensionarImagen] ✓ ÉXITO - URI redimensionada: file://...
[convertImageToBase64] ✓ Base64 leído exitosamente
[convertImageToBase64] ========== CONVERSIÓN COMPLETADA EXITOSAMENTE ==========
```

All ✓ symbols = success!

---

## 📋 When Reporting Issues

Provide:
1. **Device model** (Settings > About)
2. **Android version** (Settings > About)
3. **Free storage** (Settings > Storage)
4. **What failed:**
   - Taking photo?
   - Selecting from gallery?
   - Converting after selection?
5. **Full Metro console error** (copy entire [convertImageToBase64] section)
6. **How reproducible:**
   - Every photo fails?
   - Just screenshots?
   - Only from gallery?

---

## 🔧 For Developers

**Function flow:**
```
tomarFotoIngreso / seleccionarImagenIngreso
↓ (ImagePicker)
confirmIngresoRegister
↓
convertImageToBase64
├─ Copy content:// → cache (Android)
├─ redimensionarImagen (resize)
└─ FileSystem.readAsStringAsync (encode)
↓
executeRegister (send to API)
```

**Key considerations:**
- Android requires copying `content://` URIs to cache
- Resizing large images is RAM-intensive
- Maximum allowed file size: 700 KB
- JPEG compression: 35% quality

