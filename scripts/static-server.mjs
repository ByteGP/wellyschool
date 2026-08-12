// Minimal foreground static server for the built dist/ directory. Used by
// Playwright (astro preview daemonizes under non-TTY, which Playwright's
// webServer cannot supervise). Not used in production — Netlify serves dist/.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function resolveFile(urlPath) {
  const safePath = path.normalize(decodeURIComponent(urlPath)).replaceAll('..', '');
  let filePath = path.join(root, safePath);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!existsSync(filePath) && existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }
  return existsSync(filePath) && statSync(filePath).isFile() ? filePath : null;
}

createServer((request, response) => {
  const urlPath = new URL(request.url ?? '/', `http://${host}`).pathname;
  const filePath = resolveFile(urlPath) ?? resolveFile('/404.html');
  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }
  const status = filePath.endsWith('404.html') && urlPath !== '/404.html' ? 404 : 200;
  response.writeHead(status, {
    'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
  });
  response.end(readFileSync(filePath));
}).listen(port, host, () => {
  console.log(`Serving ${root} at http://${host}:${port}`);
});
