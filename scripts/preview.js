// Lokálny náhľad finálnej verzie: node scripts/preview.js → http://localhost:8765/tea-app/
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIST = path.join(__dirname, '..', 'dist');
const BASE = '/tea-app';
const PORT = 8765;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.css': 'text/css', '.ttf': 'font/ttf' };

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' ) { res.writeHead(302, { Location: BASE + '/' }); return res.end(); }
    if (!p.startsWith(BASE)) { res.writeHead(404); return res.end(); }
    let file = path.join(DIST, p.slice(BASE.length));
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const index = path.join(file, 'index.html');
      file = fs.existsSync(index) ? index : path.join(DIST, 'index.html'); // ako 404.html na GitHub Pages
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, '0.0.0.0', () => {
    const ip = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
    console.log(`Mac:    http://localhost:${PORT}${BASE}/`);
    if (ip) console.log(`iPhone: http://${ip}:${PORT}${BASE}/  (rovnaká Wi-Fi)`);
  });
