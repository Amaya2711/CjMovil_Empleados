        const convertImageToBase64 = async (asset) => {
          console.log('[convertImageToBase64] Iniciando conversión');
          let sourceUri = asset?.uri || asset?.localUri;
          if (!sourceUri) {
            throw new Error('No existe URI de imagen para convertir');
          }
          console.log('[convertImageToBase64] URI inicial:', sourceUri.substring(0, 80));

          let tempOriginalUri = null;
          if (Platform.OS === 'android' && sourceUri.startsWith('content://')) {
            tempOriginalUri = `${FileSystem.cacheDirectory}ingreso_original_${Date.now()}.jpg`;
            try {
              console.log('[convertImageToBase64] Copiando content:// a cache...');
              await FileSystem.copyAsync({ from: sourceUri, to: tempOriginalUri });
              sourceUri = tempOriginalUri;
              console.log('[convertImageToBase64] Copia exitosa');
            } catch (e) {
              console.error('[convertImageToBase64] Error en copia inicial:', e?.message);
              throw new Error('No se pudo copiar imagen inicial a cache');
            }
          }

          const ancho = asset?.width || 800;
          const alto = asset?.height || 600;
          const MAX_HEIGHT = 320;
          const ratio = ancho / alto;
          
          let newWidth = ancho;
          let newHeight = alto;
          if (alto > MAX_HEIGHT) {
            newHeight = MAX_HEIGHT;
            newWidth = Math.round(MAX_HEIGHT * ratio);
          }
          
          console.log('[convertImageToBase64] Redimensionando de ' + ancho + 'x' + alto + ' a ' + newWidth + 'x' + newHeight);
          let resizedUri = await redimensionarImagen(sourceUri, newWidth, newHeight);
          console.log('[convertImageToBase64] Resize devolvió:', resizedUri ? resizedUri.substring(0, 80) : 'null');

          let readUri = resizedUri;
          let tempUri = null;

          // Si resize devolvió content:// o si es content://, necesita cache
          if (Platform.OS === 'android' && readUri && readUri.startsWith('content://')) {
            tempUri = `${FileSystem.cacheDirectory}ingreso_read_${Date.now()}.jpg`;
            try {
              console.log('[convertImageToBase64] Copiando readUri content:// a cache');
              await FileSystem.copyAsync({ from: readUri, to: tempUri });
              readUri = tempUri;
              console.log('[convertImageToBase64] Copia para lectura exitosa');
            } catch (e) {
              console.error('[convertImageToBase64] Error copiando para lectura:', e?.message);
            }
          }

          try {
            console.log('[convertImageToBase64] Leyendo base64 desde:', readUri ? readUri.substring(0, 80) : 'null');
            const base64String = await FileSystem.readAsStringAsync(readUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            if (!base64String) throw new Error('Base64 vacío');
            console.log('[convertImageToBase64] Base64 generado, tamaño:', base64String.length, 'caracteres');
            return base64String;
          } catch (readErr) {
            console.error('[convertImageToBase64] Error leyendo base64:', readErr?.message);
            throw readErr;
          } finally {
            if (tempOriginalUri) {
              try {
                await FileSystem.deleteAsync(tempOriginalUri, { idempotent: true });
                console.log('[convertImageToBase64] Limpieza tempOriginalUri OK');
              } catch (e) {
                console.warn('[convertImageToBase64] Error limpiando tempOriginalUri:', e?.message);
              }
            }
            if (tempUri) {
              try {
                await FileSystem.deleteAsync(tempUri, { idempotent: true });
                console.log('[convertImageToBase64] Limpieza tempUri OK');
              } catch (e) {
                console.warn('[convertImageToBase64] Error limpiando tempUri:', e?.message);
              }
            }
          }
        };
