// Script para copiar fuentes de MaterialCommunityIcons a la carpeta public/fonts
const fs = require('fs');
const path = require('path');


// Fuente original y nombre con hash que busca el build


// Copia todos los archivos MaterialCommunityIcons.*.ttf generados por Expo export
const glob = require('glob');
const distFontsDir = path.join(__dirname, '../dist/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
const targetFontsDir = path.join(__dirname, '../dist/assets/Fonts');

if (!fs.existsSync(targetFontsDir)) {
  fs.mkdirSync(targetFontsDir, { recursive: true });
}

// Limpiar fuentes viejas
glob.sync('MaterialCommunityIcons.*.ttf', { cwd: targetFontsDir }).forEach(file => {
  fs.unlinkSync(path.join(targetFontsDir, file));
});

// Copiar nuevas fuentes
const files = glob.sync('MaterialCommunityIcons.*.ttf', { cwd: distFontsDir });
if (files.length === 0) {
  console.warn('No se encontraron archivos MaterialCommunityIcons.*.ttf en dist.');
} else {
  files.forEach(file => {
    const src = path.join(distFontsDir, file);
    const dest = path.join(targetFontsDir, file);
    fs.copyFileSync(src, dest);
    console.log(`Copiado: ${file} a ${dest}`);
  });
}
