/**
 * Post-build script: adds notranslate directives to dist/index.html
 * so browsers (Chrome, Edge, etc.) do NOT auto-translate the web app.
 * Run automatically after `expo export --platform web`.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('[patch-html] dist/index.html not found – skipping.');
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Set language to Spanish
html = html.replace(/<html([^>]*)\blang="[^"]*"/, '<html$1lang="es"');
if (!html.includes('lang=')) {
  html = html.replace('<html', '<html lang="es"');
}

// 2. Add translate="no" to <html> if not already present
if (!html.includes('translate="no"')) {
  html = html.replace(/<html([^>]*)>/, '<html$1 translate="no">');
}

// 3. Inject notranslate meta tags right after <meta charset> if not already present
if (!html.includes('content="notranslate"')) {
  html = html.replace(
    /(<meta charset="utf-8"\s*\/>)/i,
    '$1\n    <meta name="google" content="notranslate" />\n    <meta http-equiv="Content-Language" content="es" />'
  );
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-html] dist/index.html patched: notranslate + lang=es applied.');
