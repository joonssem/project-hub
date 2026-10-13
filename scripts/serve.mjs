import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(process.cwd(),process.argv.includes('--dist') ? 'dist' : '.');
const port = Number(process.env.PORT || 4173);
const base = process.env.BASE_PATH || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base)) throw new Error('BASE_PATH must start and end with /.');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer(async (req,res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (base !== '/') {
      if (!pathname.startsWith(base)) {res.writeHead(404);res.end('Not found');return;}
      pathname = '/'+pathname.slice(base.length);
    }
    const allowed = pathname === '/' || pathname === '/index.html' || pathname === '/styles.css' || /^\/(src|data|assets)\/[\w/.-]+$/.test(pathname);
    const file = path.resolve(root,'.'+(pathname === '/' ? '/index.html' : pathname));
    if (!allowed || !file.startsWith(root+path.sep) || pathname.includes('..')) {res.writeHead(404);res.end('Not found');return;}
    const content = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  } catch {res.writeHead(404);res.end('Not found');}
}).on('error',error => {console.error(error.code === 'EADDRINUSE' ? `포트 ${port}가 사용 중입니다. 기존 미리보기를 사용하거나 PORT 환경변수를 지정하세요.` : error.message);process.exitCode=1;}).listen(port,'127.0.0.1',() => console.log(`Project Hub: http://localhost:${port}${base}`));
