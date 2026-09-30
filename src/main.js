import { CFG } from './config.js';
import { Simulation, newGame, currentMission, zonePosition } from './simulation.js';
import { SaveStore, encodeSave, decodeSave } from './save.js';
import { Renderer } from './render.js';
import { InputController } from './input.js';
import { UI } from './ui.js';
import { authenticate, logout } from './profile.js';
import { swapRosterPlayers, getStarters } from './roster.js';
async function boot(){
 const profile=await authenticate();
 const storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
 const store=new SaveStore(storage,profile.saveKey,profile.backupKey),loaded=store.load();
 if(loaded.status==='new')loaded.state=newGame(profile);
 const sim=new Simulation(loaded.state),renderer=new Renderer(document.getElementById('game'));await renderer.ready;
 document.getElementById('asset-loading').hidden=true;
 let input,lastTime=performance.now(),accumulator=0,lastSaved=sim.state.t,conflict=false,lastUI=0,lastDraw=0;
 const persist=(force=false)=>{const result=store.save(sim.state,force);ui.saveStatus(result.ok);if(result.conflict){conflict=true;ui.open('menu-dialog');ui.toast(result.reason,30);}else if(!result.ok&&force)ui.toast(result.reason,8);return result;};
 const district=area=>{renderer.district=['pitch1','pitch2','stands','gate','canteen','arena'].includes(area)?'arena':area;renderer.initialized=false;input?.reset();document.body.dataset.district=renderer.district;};
 const applyResult=result=>{if(!result?.ok){ui.toast(result?.reason||'Ação indisponível.',6);return false;}ui.renderKey='';ui.update(sim.state,true);persist();return true;};
 const ui=new UI({
  start:()=>{input.reset();lastTime=performance.now();if(loaded.message)ui.toast(loaded.message,9);},
  onPauseChange:()=>{input?.reset();accumulator=0;lastTime=performance.now();},
  travel:zone=>{district('arena');const p=zonePosition(zone);if(p)sim.goTo(p);},
  navigate:()=>{const m=currentMission(sim.state);if(!m){district('club');ui.openSports('land');return;}if(['club','facilities','league'].includes(m.zone)){district('club');ui.openSports(m.zone==='club'?'land':m.zone);return;}const p=m.zone?zonePosition(m.zone):CFG.supply;if(p){district('arena');sim.goTo(p);}},
  toggleView:()=>{district('arena');renderer.overview=!renderer.overview;return renderer.overview;},
  toggleQuality:()=>{renderer.lowQuality=!renderer.lowQuality;renderer.resize();return renderer.lowQuality;},
  district,purchase:id=>applyResult(sim.purchase(id)),
  export:()=>{const blob=new Blob([encodeSave(sim.state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`arena-${profile.id}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);ui.toast('Backup exportado. Guarde seu JSON.');},
  import:async text=>{const next=decodeSave(text);sim.state=next;sim.events=[];renderer.particles=[];ui.lastMission=null;conflict=false;lastSaved=sim.state.t;input.reset();const r=persist(true);ui.update(sim.state,true);ui.toast(r.ok?'Progresso importado no perfil atual.':'Importado apenas nesta sessão. Exporte antes de sair.',8);},
  reset:()=>{if(!store.reset()){ui.toast('Não foi possível limpar o armazenamento.');return;}sim.state=newGame(profile);sim.events=[];renderer.particles=[];ui.lastMission=null;conflict=false;lastSaved=0;input.reset();district('arena');persist(true);ui.update(sim.state,true);ui.open('welcome-dialog');},
  logout:async()=>{const r=persist();if(!r.ok&&!confirm('O progresso não foi salvo. Sair mesmo assim?'))return;try{await logout();}catch(e){ui.toast(e.message);}},
  command:(name,id)=>{
   let result;
   const functions={train:()=>sim.trainPlayer(id),trainYouth:()=>sim.trainYouth(id),hire:()=>sim.hireMarket(id),refresh:()=>sim.refreshMarket(),scout:()=>sim.scoutYouth(),promote:()=>sim.promoteYouth(id),sellYouth:()=>sim.sellYouth(id),facility:()=>sim.upgradeFacility(id),land:()=>sim.buyLand(id),captain:()=>sim.setTactic('captain',id),formation:()=>sim.setTactic('formation',id),posture:()=>sim.setTactic('posture',id),campaign:()=>sim.startCampaign(),club:()=>sim.editClub(id.name,id.sigla),season:()=>sim.nextSeason(),round:()=>sim.playLeagueRound()};
   if(name==='sell'){if(!confirm('Vender este reserva? A operação não pode ser desfeita.'))return;result=sim.sellPlayer(id);}
   else if(name==='sub'){const s=sim.state,p=s.roster.find(p=>p.id===id),target=getStarters(s.roster).filter(p2=>p2.pos===p?.pos).sort((a,b)=>a.overall-b.overall)[0];if(!p||!target)result={ok:false,reason:'Não há titular da mesma posição para trocar.'};else{swapRosterPlayers(s.roster,p.id,target.id);if(s.tactics.captainId===target.id)s.tactics.captainId=null;sim.emit('tactic',`${p.name} entrou no lugar de ${target.name}.`);result={ok:true};}}
   else if(functions[name])result=functions[name]();else result={ok:false,reason:'Ação não reconhecida.'};
   if(applyResult(result)&&name==='round'){ui.close();district(sim.state.facilities.stadium?'stadium':'arena');ui.toast('Partida oficial iniciada. Seu time é o azul; acompanhe o placar.',6);}
  }
 });
 renderer.district='arena';
 input=new InputController(renderer.canvas,document.getElementById('joystick'),(x,y)=>{
  const p=renderer.clickPosition(x,y);
  if(p.zone==='campus'){if(p.plot)ui.openSports('land');else if(p.facility==='arena')district('arena');else if(p.facility){if(renderer.district==='club')district(p.facility);else ui.openSports(p.facility==='youth'?'youth':['board','marketing','coaching'].includes(p.facility)?'board':'facilities');}return;}
  if(p.zone==='office')ui.open('upgrade-dialog');else if(renderer.district==='arena')sim.goTo(p);
 },()=>ui.paused||conflict,(x,y)=>renderer.screenAxisToWorld(x,y));
 window.addEventListener('resize',()=>renderer.resize());
 document.addEventListener('visibilitychange',()=>{input.reset();lastTime=performance.now();accumulator=0;if(document.hidden&&store.writable)persist();});
 window.addEventListener('pagehide',()=>{if(store.writable)persist();});
 window.addEventListener('storage',e=>{if(e.key===store.saveKey&&e.newValue!==store.lastRaw){conflict=true;store.writable=false;input.reset();ui.open('menu-dialog');ui.saveStatus(false,'OUTRA ABA ALTEROU O SAVE');ui.toast('Feche a outra aba e recarregue. Seu progresso não será sobrescrito.',30);}});
 if(['new','unavailable','invalid'].includes(loaded.status))ui.open('welcome-dialog');else if(loaded.message)ui.toast(loaded.message,8);
 ui.update(sim.state,true);ui.saveStatus(store.writable);const step=1/60;
 function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(!ui.paused&&!document.hidden&&!conflict){accumulator+=dt;while(accumulator>=step){sim.tick(step,renderer.district==='arena'?input.read():{x:0,z:0});accumulator-=step;}if(sim.state.t-lastSaved>=CFG.autosaveSeconds){if(store.writable)persist();lastSaved=sim.state.t;}}else accumulator=0;
  const events=sim.drainEvents();renderer.addEvents(events);for(const e of events)ui.showEvent(e);
  if(now-lastUI>=150){ui.update(sim.state);lastUI=now;}
  if(now-lastDraw>=(renderer.lowQuality?1000/30:1000/60)-1){renderer.draw(sim.state,Math.min(.1,(now-lastDraw)/1000));lastDraw=now;}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 if(new URLSearchParams(location.search).get('debug')==='1')window.__arena={
  snapshot:()=>structuredClone(sim.state),goTo:zone=>{const p=zonePosition(zone);return p?sim.goTo(p):false;},
  step:seconds=>{if(ui.paused||conflict)throw new Error('Feche os menus.');if(!Number.isFinite(seconds)||seconds<0||seconds>120)throw new Error('Use até 120 segundos.');for(let i=0;i<Math.ceil(seconds*60);i++)sim.tick(step);const events=sim.drainEvents();renderer.addEvents(events);events.forEach(e=>ui.showEvent(e));ui.update(sim.state,true);renderer.draw(sim.state,.016);return structuredClone(sim.state);},
  save:()=>persist(),rendererInfo:()=>({width:renderer.width,height:renderer.height,loaded:renderer.loaded,assets:Object.keys(renderer.assets),hits:renderer.hitZones,district:renderer.district})
 };
}
boot().catch(error=>{console.error(error);document.getElementById('asset-loading').hidden=true;const card=document.createElement('section');card.className='fatal-error';const title=document.createElement('h1');title.textContent='Não foi possível abrir a arena.';const text=document.createElement('p');text.textContent=error.message||'Erro desconhecido.';card.append(title,text);document.body.append(card);});
