import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {hashPassword} from '../server/auth.mjs';
const secret='qa-session-secret-for-local-test-ONLY-'+Date.now();
const password='qa-test-password-not-a-user-credential';
const passwordHash=await hashPassword(password);
const users=[{id:'bernardo',name:'Bernardo Cafure',passwordHash},{id:'miguel',name:'Miguel Matos',passwordHash}];
const processServer=spawn(process.execPath,['tools/server.mjs','--dir=dist','--port=5177'],{cwd:new URL('..',import.meta.url),env:{...process.env,ARENA_USERS_JSON:JSON.stringify(users),ARENA_SESSION_SECRET:secret},stdio:'ignore'});
const root='http://127.0.0.1:5177',checks=[];const record=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw new Error(name);};
try{
 for(let i=0;i<40;i++){try{await fetch(root);break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const main=await fetch(root),text=await main.text();record('production HTTP 200',main.status===200);record('production contains WorldSimulation',text.includes('class WorldSimulation'));record('production contains on-map controls',text.includes('world-inspector'));record('version is 0.5',text.includes('Mapa Vivo 0.5'));
 for(const image of['arena-mapa.png','gerente.png','atleta-azul.png']){const r=await fetch(root+'/assets/'+image);record('image '+image,r.status===200&&r.headers.get('content-type')==='image/png');}
 const noSession=await(await fetch(root+'/api/session')).json();record('no anonymous authenticated user',noSession.user===null);
 const wrong=await fetch(root+'/api/session',{method:'POST',headers:{'Content-Type':'application/json','Origin':root},body:JSON.stringify({username:'bernardo',password:'wrong'})});record('invalid password rejected',wrong.status===401);
 const login=await fetch(root+'/api/session',{method:'POST',headers:{'Content-Type':'application/json','Origin':root},body:JSON.stringify({username:'bernardo',password})});const data=await login.json();record('valid login',login.status===200&&data.user.id==='bernardo');
 const cookie=login.headers.get('set-cookie');record('HttpOnly cookie',cookie.includes('HttpOnly'));const follow=await(await fetch(root+'/api/session',{headers:{Cookie:cookie.split(';')[0]}})).json();record('session roundtrip',follow.user.id==='bernardo');record('no hash in API response',!JSON.stringify(data).includes('scrypt'));
 const env=await fetch(root+'/.env.local');record('private env not served',env.status===403);const forbidden=await fetch(root+'/server/auth.mjs');record('auth source not served',forbidden.status===404);
}finally{processServer.kill('SIGTERM');await writeFile('qa/http-world-report.json',JSON.stringify({checks,passed:checks.filter(x=>x.ok).length},null,2));}
console.log(checks.length+' local HTTP checks passed. Temporary QA credentials were not saved.');
