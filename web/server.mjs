import next from 'next';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
const dev=process.argv.includes('--dev');
const port=Number(process.env.PORT||4174);
process.env.BUILDDESK_EDIT_TOKEN=randomBytes(32).toString('hex');
const app=next({dev,hostname:'0.0.0.0',port});
await app.prepare();
const handler=app.getRequestHandler();
http.createServer((req,res)=>{
  // Set from the actual socket; never trust forwarded client headers.
  const address=req.socket.remoteAddress||'';
  req.headers['x-builddesk-local']=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)?'1':'0';
  handler(req,res);
}).listen(port,'0.0.0.0',()=>console.log(`Build Desk: http://127.0.0.1:${port} (home-network clients are read-only)`));
