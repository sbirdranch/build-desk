// Local-only asset gallery. This is not the production workflow application.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.ico':'image/x-icon'};
http.createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative = pathname==='/' ? 'gallery.html' : pathname.replace(/^\/+/, '');
    // Expose only the gallery, display assets and Three's browser modules.
    if (!(relative==='gallery.html'||relative.startsWith('assets/')||relative.startsWith('node_modules/three/build/')||relative.startsWith('node_modules/three/examples/jsm/'))) {
      res.writeHead(404);res.end('Not found');return;
    }
    const file=path.resolve(root,relative);
    const allowedRoots=['assets','node_modules/three/build','node_modules/three/examples/jsm'].map(p=>path.resolve(root,p)+path.sep);
    if(file!==path.join(root,'gallery.html')&&!allowedRoots.some(p=>file.startsWith(p))){res.writeHead(403);res.end();return;}
    const info=await stat(file);
    if(!info.isFile())throw new Error('Not file');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Build Desk asset gallery: http://127.0.0.1:4173'));
