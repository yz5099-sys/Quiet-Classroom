import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);
const port = Number(process.env.PORT || 3000);
createServer(async (req, res) => {
  const entry = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!entry || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL(entry[0], import.meta.url));
    res.writeHead(200, {
      'Content-Type': entry[1],
      'Permissions-Policy': 'microphone=(self)',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500);
    res.end('Unable to load this file');
  }
}).listen(port, '127.0.0.1', () =>
  console.log(`Quiet Classroom is ready at http://localhost:${port}`),
);
