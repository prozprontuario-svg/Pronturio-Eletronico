const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const publicRoot = path.resolve(__dirname, 'Proz-Saude');
const port = Number(process.env.PROZ_SAUDE_PORT || 5173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const handleRequest = (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/Preview/ABRIR-PREVIA.html';

  const filePath = path.resolve(publicRoot, `.${pathname}`);
  const relativePath = path.relative(publicRoot, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': stat.size,
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    fs.createReadStream(filePath).pipe(response);
  });
};

function startServer(portToTry) {
  const server = http.createServer(handleRequest);

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`A porta ${portToTry} já está ocupada; tentando ${portToTry + 1}.`);
      startServer(portToTry + 1);
      return;
    }

    console.error('Não foi possível iniciar o servidor:', error.message);
    process.exitCode = 1;
  });

  server.listen(portToTry, '127.0.0.1', () => {
    console.log(`Prévia Proz Saúde disponível em http://localhost:${portToTry}`);
    console.log('Pressione Ctrl+C para encerrar.');
  });
}

startServer(port);
