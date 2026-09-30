/** Perfis locais isolados. Autenticação online é feita por /api/session, não aqui. */
export const PROFILES=Object.freeze([
 {id:'bernardo',name:'Bernardo Cafure',clubName:'Bernardo FC',sigla:'BFC',saveKey:'arena-de-bairro.profile.bernardo',backupKey:'arena-de-bairro.backup.bernardo'},
 {id:'miguel',name:'Miguel Matos',clubName:'Miguel FC',sigla:'MFC',saveKey:'arena-de-bairro.profile.miguel',backupKey:'arena-de-bairro.backup.miguel'}
]);
export function getActiveProfileId(){try{return localStorage.getItem('arena-de-bairro.active-profile')||'bernardo';}catch{return'bernardo';}}
export function setActiveProfileId(id){if(!PROFILES.some(p=>p.id===id))throw new Error('Perfil inválido.');try{localStorage.setItem('arena-de-bairro.active-profile',id);}catch{/* O jogo avisa quando não pode salvar. */}}
export function getProfileConfig(id=getActiveProfileId()){return PROFILES.find(p=>p.id===id)||PROFILES[0];}
export async function authenticate(){
 const panel=document.getElementById('login-screen'),form=document.getElementById('login-form'),message=document.getElementById('login-message'),local=location.protocol==='file:';
 const choose=id=>{setActiveProfileId(id);panel.hidden=true;return getProfileConfig(id);};
 if(local){document.getElementById('login-password-label').hidden=true;document.getElementById('login-password').required=false;document.getElementById('login-mode').textContent='DEMONSTRAÇÃO LOCAL · SEM AUTENTICAÇÃO';message.textContent='O HTML de demonstração separa os perfis neste navegador. O site usa a senha validada no servidor.';}
 else{
  try{const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'}),data=await response.json();if(response.ok&&data.user)return choose(data.user.id);if(response.status===503)message.textContent='Configure ARENA_USERS_JSON e ARENA_SESSION_SECRET no servidor antes de jogar.';}
  catch{message.textContent='Servidor de login indisponível. Use npm run dev ou publique com a API incluída.';}
 }
 panel.hidden=false;
 return new Promise(resolve=>form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;
  try{const id=document.getElementById('login-user').value;if(local){resolve(choose(id));return;}
   const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:id,password:document.getElementById('login-password').value})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível entrar.');document.getElementById('login-password').value='';resolve(choose(data.user.id));
  }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
 }));
}
export async function logout(){if(location.protocol!=='file:'){const r=await fetch('/api/session',{method:'DELETE',credentials:'same-origin'});if(!r.ok)throw new Error('Não foi possível sair com segurança. Tente novamente.');}location.reload();}
