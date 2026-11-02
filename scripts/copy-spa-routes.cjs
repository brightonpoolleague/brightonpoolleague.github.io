const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.warn('[copy-spa-routes] dist/index.html not found, skipping route copies.');
  process.exit(0);
}

// 1. Copy to 404.html for GitHub Pages fallback
fs.copyFileSync(indexHtml, path.join(distDir, '404.html'));
console.log('[copy-spa-routes] Generated dist/404.html');

// 2. Copy to dist/status/index.html for direct /status route on GitHub Pages
const statusDir = path.join(distDir, 'status');
if (!fs.existsSync(statusDir)) {
  fs.mkdirSync(statusDir, { recursive: true });
}
fs.copyFileSync(indexHtml, path.join(statusDir, 'index.html'));
console.log('[copy-spa-routes] Generated dist/status/index.html');
