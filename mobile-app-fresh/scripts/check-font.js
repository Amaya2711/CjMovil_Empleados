// Script para verificar la existencia de la fuente con hash antes del build
const fs = require('fs');
const path = require('path');

const hash = '6e435534bd35da5fef04168860a9b8fa';
const fontPath = path.join(__dirname, `../public/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.${hash}.ttf`);

if (fs.existsSync(fontPath)) {
  console.log('✅ La fuente con hash existe:', fontPath);
  process.exit(0);
} else {
  console.error('❌ La fuente con hash NO existe:', fontPath);
  process.exit(1);
}
