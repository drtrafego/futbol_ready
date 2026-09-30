import { createHmac, timingSafeEqual, scrypt as scryptCallback, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
const COOKIE='arena_session';const AGE=7*24*60*60;const attempts=new Map();
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});return `scrypt$${salt}$${hash.toString('hex')}`;}
export async function verifyPassword(password,encoded){
 const [kind,salt,want]=String(encoded).split('$');if(kind!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{64}$/.test(want||''))return false;
 const actual=await scrypt(password,salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024});return timingSafeEqual(actual,Buffer.from(want,'hex'));
}
export function authConfig(env=process.env){
 try{const secret=env.ARENA_SESSION_SECRET,users=JSON.parse(env.ARENA_USERS_JSON||'[]');
  if(!secret||secret.length<32||!Array.isArray(users)||users.length!==2||!users.every(u=>['bernardo','miguel'].includes(u.id)&&typeof u.name==='string'&&typeof u.passwordHash==='string')||new Set(users.map(u=>u.id)).size!==2)return null;
  return{secret,users};
 }catch{return null;}
}
export function createSession(id,secret,now=Math.floor(Date.now()/1000)){
 const data=Buffer.from(JSON.stringify({id,exp:now+AGE,nonce:randomBytes(12).toString('hex')})).toString('base64url');
 return `${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;
}
export function readSession(token,secret,now=Math.floor(Date.now()/1000)){
 try{if(typeof token!=='string'||token.length>1024)return null;const [data,sig,extra]=token.split('.');if(extra||!sig)return null;
 const expected=createHmac('sha256',secret).update(data).digest(),actual=Buffer.from(sig,'base64url');if(actual.length!==expected.length||!timingSafeEqual(expected,actual))return null;
 const payload=JSON.parse(Buffer.from(data,'base64url').toString());if(!['bernardo','miguel'].includes(payload.id)||!Number.isFinite(payload.exp)||payload.exp<=now||payload.exp>now+AGE+60)return null;return payload;
 }catch{return null;}
}
function originAllowed(req){
 const origin=req.headers.origin;if(!origin)return false;
 try{return new URL(origin).host===req.headers.host;}catch{return false;}
}
async function jsonBody(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string'){if(req.body.length>2048)throw new Error('large');return JSON.parse(req.body);}let text='';for await(const chunk of req){text+=chunk;if(text.length>2048)throw new Error('large');}return JSON.parse(text);}
export async function handleSession(req,res){
 const send=(status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));};
 const config=authConfig();if(!config)return send(503,{error:'Login ainda não configurado no servidor.'});
 if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(405,{error:'Método não permitido.'});}
 const secure=req.headers['x-forwarded-proto']==='https'||Boolean(req.socket?.encrypted)||process.env.VERCEL==='1';
 const cookie=(value,age)=>`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
 if(req.method==='GET'){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const session=readSession(token,config.secret),user=config.users.find(u=>u.id===session?.id);return send(200,{user:user?{id:user.id,name:user.name}:null});
 }
 if(!originAllowed(req))return send(403,{error:'Origem não autorizada.'});
 if(req.method==='DELETE'){res.setHeader('Set-Cookie',cookie('',0));return send(200,{ok:true});}
 if(!String(req.headers['content-type']).startsWith('application/json'))return send(415,{error:'Formato inválido.'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].slice(0,80),now=Date.now();
 for(const [key,item]of attempts)if(now-item.start>600000)attempts.delete(key);
 if(attempts.size>5000)attempts.clear();const bucket=attempts.get(ip)||{start:now,n:0};
 if(bucket.n>=10){res.setHeader('Retry-After','600');return send(429,{error:'Muitas tentativas. Aguarde alguns minutos.'});}
 bucket.n++;attempts.set(ip,bucket);
 let body;try{body=await jsonBody(req);}catch{return send(400,{error:'Pedido inválido.'});}
 if(typeof body.username!=='string'||body.username.length>80||typeof body.password!=='string'||body.password.length>128)return send(400,{error:'Usuário ou senha inválidos.'});
 const value=body.username.trim().toLocaleLowerCase('pt-BR'),user=config.users.find(u=>u.id===value||u.name.toLocaleLowerCase('pt-BR')===value);
 const match=await verifyPassword(body.password,(user||config.users[0]).passwordHash);if(!user||!match)return send(401,{error:'Usuário ou senha incorretos.'});
 attempts.delete(ip);res.setHeader('Set-Cookie',cookie(createSession(user.id,config.secret),AGE));return send(200,{user:{id:user.id,name:user.name}});
}
