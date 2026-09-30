import http from 'node:http';
import { handleSession } from '../server/auth.mjs';
try{process.loadEnvFile(new URL('../.env.local',import.meta.url));}catch{/* Configure .env.local ou use a demonstração HTML. */}
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';

const options=Object.fromEntries(process.argv.slice(2).filter(a=>a.includes('=')).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
const port=Number(options.port||5173),host=options.host||'127.0.0.1';
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Porta deve ser um inteiro entre 1024 e 65535.');
if(!['127.0.0.1','0.0.0.0','localhost'].includes(host))throw new Error('Host permitido: 127.0.0.1, localhost ou 0.0.0.0.');
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=await realpath(path.resolve(project,options.dir||'.'));
if(root!==project&&!root.startsWith(project+path.sep))throw new Error('Diretório deve ficar dentro do projeto.');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  const headers={'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
  try{
    if(new URL(req.url,'http://local.invalid').pathname==='/api/session'){await handleSession(req,res);return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers);res.end('Método não permitido.');return;}
    const parsed=new URL(req.url,'http://local.invalid');
    const pathname=decodeURIComponent(parsed.pathname);
    if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(403,headers);res.end('Acesso negado.');return;}
    if(pathname.startsWith('/server/')||pathname.startsWith('/api/')){res.writeHead(404,headers);res.end();return;}
    const name=pathname==='/'?'index.html':pathname.slice(1);
    const extension=path.extname(name);
    if(!types[extension]){res.writeHead(404,headers);res.end('Arquivo não disponível.');return;}
    const file=await realpath(path.resolve(root,name));
    if(!file.startsWith(root+path.sep)||(await stat(file)).isDirectory()){res.writeHead(403,headers);res.end('Acesso negado.');return;}
    const body=await readFile(file);
    res.writeHead(200,{...headers,'Content-Type':types[extension],'Content-Length':body.length});res.end(req.method==='HEAD'?undefined:body);
  }catch(error){const code=error instanceof URIError?400:404;res.writeHead(code,headers);res.end(code===400?'URL inválida.':'Arquivo não encontrado.');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Porta ${port} ocupada. Feche a outra instância ou use --port=5174.`:error.message);process.exitCode=1;});
server.listen(port,host,()=>{
  console.log(`\nArena de Bairro — servidor local\nAbra: http://127.0.0.1:${port}\nCtrl+C para encerrar.\n`);
  if(host==='0.0.0.0')console.log(`LAN habilitada. No celular, use http://IP-DO-PC:${port} na mesma rede privada. O login requer .env.local. Use este servidor apenas na rede privada; publique na Vercel para acesso externo.\n`);
  if(process.argv.includes('--open')&&process.platform==='win32')execFile('cmd',['/c','start','','http://127.0.0.1:'+port],()=>{});
});
