import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {hashPassword} from '../server/auth.mjs';
const port=31973,origin=`http://127.0.0.1:${port}`,password=randomBytes(12).toString('hex'),secret=randomBytes(32).toString('hex');
const users=await Promise.all(['bernardo','miguel'].map(async id=>({id,name:'Usuário de teste '+id,passwordHash:await hashPassword(password)})));
const child=spawn(process.execPath,['tools/server.mjs','--dir=dist','--port='+port],{cwd:new URL('..',import.meta.url),env:{...process.env,ARENA_USERS_JSON:JSON.stringify(users),ARENA_SESSION_SECRET:secret},stdio:['ignore','pipe','pipe']});
const results=[];function record(name,ok){results.push({name,ok:!!ok});if(!ok)throw Error(name);}
try{
 for(let n=0;n<50;n++){try{await fetch(origin);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const html=await fetch(origin);record('production HTML is served',html.status===200);const text=await html.text();record('production bundle contains new modules',text.includes('class TycoonSimulation')&&text.includes('class TycoonUI'));record('HTML does not contain temporary secret',!text.includes(secret));
 record('image asset served',(await fetch(origin+'/assets/gerente.png')).status===200);
 record('private env unavailable',(await fetch(origin+'/.env.local')).status!==200);
 record('server implementation not public',(await fetch(origin+'/server/auth.mjs')).status===404);
 const anon=await (await fetch(origin+'/api/session')).json();record('anonymous session has no user',anon.user===null);
 const request=body=>({method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const wrong=await fetch(origin+'/api/session',request({username:'bernardo',password:'wrong-password'}));record('wrong password rejected',wrong.status===401);
 const cross=await fetch(origin+'/api/session',{...request({username:'bernardo',password}),headers:{Origin:'https://invalid.example','Content-Type':'application/json'}});record('cross-origin login rejected',cross.status===403);
 const login=await fetch(origin+'/api/session',request({username:'bernardo',password}));record('temporary test login accepted',login.status===200);const cookie=login.headers.get('set-cookie');record('session uses HttpOnly cookie',cookie.includes('HttpOnly'));record('session uses SameSite',cookie.includes('SameSite=Strict'));
 const current=await (await fetch(origin+'/api/session',{headers:{Cookie:cookie.split(';')[0]}})).json();record('cookie restores correct identity',current.user?.id==='bernardo');
 const deleted=await fetch(origin+'/api/session',{method:'DELETE',headers:{Origin:origin,Cookie:cookie.split(';')[0]}});record('logout clears session cookie',deleted.status===200&&deleted.headers.get('set-cookie').includes('Max-Age=0'));
 const second=await fetch(origin+'/api/session',request({username:'miguel',password}));record('second temporary account accepted',second.status===200);
}finally{child.kill('SIGTERM');await writeFile(new URL('http-report.json',import.meta.url),JSON.stringify({method:'HTTP local em servidor real. Usuários temporários criados apenas em memória; não foram utilizadas as senhas do usuário nem testada a Vercel.',results},null,2));}
console.log(`${results.length} verificações HTTP passaram. Nenhuma credencial foi registrada.`);
