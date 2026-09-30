import { CFG } from './config.js';
import { newGame, currentMission, zonePosition } from './simulation.js';
import { WorldSimulation } from './world-simulation.js';
import { ensureWorld, WORLD_STRUCTURES, WORLD_PLOTS } from './world-model.js';
import { SaveStore, encodeSave, decodeSave } from './save.js';
import { WorldRenderer } from './world-view.js';
import { WorldInput } from './world-input.js';
import { WorldUI } from './world-ui.js';
import { authenticate, logout } from './profile.js';
import { swapRosterPlayers, getStarters } from './roster.js';
import { worldToArt } from './scene.js';

async function boot(){
 const profile=await authenticate();
 const storage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
 const store=new SaveStore(storage,profile.saveKey,profile.backupKey),loaded=store.load();if(loaded.status==='new')loaded.state=newGame(profile);
 const sim=new WorldSimulation(loaded.state),renderer=new WorldRenderer(document.getElementById('game'));await renderer.ready;
 document.getElementById('asset-loading').hidden=true;
 let input,lastTime=performance.now(),accumulator=0,lastSaved=sim.state.t,conflict=false,lastUI=0,lastDraw=0;
 const persist=(force=false)=>{const result=store.save(sim.state,force);ui.saveStatus(result.ok);if(result.conflict){conflict=true;ui.open('menu-dialog');ui.toast(result.reason,30);}else if(!result.ok&&force)ui.toast(result.reason,8);return result;};
 const focus=(id,select=true)=>{renderer.focus(id,sim.state,select);if(id==='all'||id==='club')renderer.selection=null;input?.reset();ui.inspectorKey='';ui.update(sim.state,true);};
 const applyResult=result=>{if(!result?.ok){ui.toast(result?.reason||'Ação indisponível.',6);return false;}ui.renderKey='';ui.update(sim.state,true);persist();return true;};
 const beginPlacement=id=>{const s=sim.state;if(!WORLD_STRUCTURES[id])return;if(s.map.placements[id]||WORLD_STRUCTURES[id].fixed){focus(id);return;}focus(id,false);renderer.placement=id;renderer.hover={x:WORLD_STRUCTURES[id].x,y:WORLD_STRUCTURES[id].y};ui.close();ui.toast('Posicione a base verde no terreno e toque para confirmar. Arraste para mover o mapa.',7);};
 const ui=new WorldUI({
  start:()=>{input.reset();lastTime=performance.now();if(loaded.message)ui.toast(loaded.message,9);},
  onPauseChange:()=>{input?.reset();accumulator=0;lastTime=performance.now();},
  focus,
  district:id=>focus(id),
  travel:zone=>{const p=zonePosition(zone);if(p){const ok=sim.goTo(p);if(!ok)ui.toast('Não há passagem até este ponto.');renderer.mapCamera.follow=true;renderer.mapCamera.zoom=Math.max(.65,renderer.mapCamera.zoom);}},
  navigate:()=>{const s=sim.state,m=currentMission(s);if(!m||['club','facilities'].includes(m.zone)){
   if(!s.land.academy)focus('academy');else if(!s.facilities.youth)beginPlacement('youth');else if(!s.facilities.training)beginPlacement('training');else if(!s.land.stadium)focus('stadium');else if(!s.facilities.stadium)beginPlacement('stadium');else if(!s.land.business)focus('business');else if(!s.facilities.board)beginPlacement('board');else focus('all');return;
  }if(m.zone==='league'){ui.openSports('league');return;}const point=zonePosition(m.zone)||CFG.supply;sim.goTo(point);renderer.mapCamera.follow=true;},
  toggleView:()=>renderer.follow(sim.state),
  toggleQuality:()=>{renderer.lowQuality=!renderer.lowQuality;renderer.resize();return renderer.lowQuality;},
  purchase:id=>{const result=sim.purchase(id);if(applyResult(result)&&id==='field2')ui.toast('Segundo campo aberto. Agora explore os terrenos ao redor da arena.',7);},
  export:()=>{const blob=new Blob([encodeSave(sim.state)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`arena-${profile.id}-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);ui.toast('Backup exportado. Guarde seu JSON.');},
  import:async text=>{const next=decodeSave(text);sim.state=next;ensureWorld(next);sim.events=[];renderer.particles=[];renderer.roadKey='';renderer.selection=null;ui.lastMission=null;conflict=false;lastSaved=next.t;input.reset();const result=persist(true);ui.update(next,true);ui.toast(result.ok?'Progresso importado, incluindo mapa e obras.':'Armazenamento indisponível; exporte antes de sair.',7);},
  reset:()=>{if(!store.reset()){ui.toast('Não foi possível limpar o armazenamento.');return;}sim.state=newGame(profile);ensureWorld(sim.state);sim.events=[];renderer.particles=[];renderer.roadKey='';renderer.selection=null;ui.lastMission=null;conflict=false;lastSaved=0;input.reset();focus('arena',false);persist(true);ui.update(sim.state,true);ui.open('welcome-dialog');},
  logout:async()=>{const result=persist();if(!result.ok&&!confirm('O progresso não foi salvo. Sair mesmo assim?'))return;try{await logout();}catch(error){ui.toast(error.message);}},
  worldCommand:(cmd,id)=>{
   if(cmd==='closeInspector'){renderer.selection=null;return;}
   if(cmd==='cancel'){renderer.placement=null;return;}
   if(cmd==='zoomIn'||cmd==='zoomOut'){renderer.zoomAt(cmd==='zoomIn'?1.25:.8);return;}
   if(cmd==='focusPlot'){ui.close();focus(id);renderer.selection={kind:'plot',id};ui.inspectorKey='';ui.update(sim.state,true);return;}
   if(cmd==='focusBuilding'){ui.close();focus(id);return;}
   if(cmd==='operation'){ui.open('upgrade-dialog');return;}
   if(cmd==='manage'){ui.openSports(id);return;}
   if(cmd==='place'){beginPlacement(id);return;}
   if(cmd==='buyLand'){if(applyResult(sim.buyLand(id))){renderer.selection={kind:'plot',id};renderer.roadKey='';ui.toast('Terreno incorporado ao clube. Escolha a instalação e posicione no chão.',6);}return;}
   if(cmd==='upgrade'){applyResult(sim.upgradeFacility(id));return;}
   if(cmd==='walkBuilding'){if(!sim.moveToStructure(id))ui.toast('Não há caminho livre até a entrada.');else renderer.mapCamera.follow=true;return;}
   if(cmd==='deliverCT'){if(sim.state.player.carry<1){sim.goTo(CFG.supply);renderer.mapCamera.follow=true;ui.toast('Pegue kits no depósito. Depois use “Levar os kits ao CT”.');}else if(sim.moveToStructure('training')){renderer.mapCamera.follow=true;ui.toast('O gerente vai levar os kits ao CT. A entrega ocorre ao chegar.');}else ui.toast('Não há passagem livre até o CT.');return;}
   if(cmd==='courier'){applyResult(sim.hireCourier());return;}
   if(cmd==='trainTeam'){if(applyResult(sim.trainTeam())){ui.close();focus('training');}return;}
  },
  command:(name,id)=>{
   let result;const functions={train:()=>sim.trainPlayer(id),trainYouth:()=>sim.trainYouth(id),hire:()=>sim.hireMarket(id),refresh:()=>sim.refreshMarket(),scout:()=>sim.scoutYouth(),promote:()=>sim.promoteYouth(id),sellYouth:()=>sim.sellYouth(id),captain:()=>sim.setTactic('captain',id),formation:()=>sim.setTactic('formation',id),posture:()=>sim.setTactic('posture',id),campaign:()=>sim.startCampaign(),club:()=>sim.editClub(id.name,id.sigla),season:()=>sim.nextSeason(),round:()=>sim.playLeagueRound()};
   if(name==='facility'){ui.close();focus(id);return;}if(name==='land'){ui.close();focus(id);return;}
   if(name==='resetTeam'){if(!confirm('Deseja realmente começar um novo time e zerar todo o histórico esportivo (elenco, divisões e temporadas)?'))return;result=sim.resetTeam(profile);if(applyResult(result)){ui.toast('Novo time iniciado! Elenco renovado e histórico zerado.',6);focus('arena',false);}return;}
   if(name==='sell'){if(!confirm('Vender este reserva? Esta ação não pode ser desfeita.'))return;result=sim.sellPlayer(id);}
   else if(name==='sub'){const s=sim.state,p=s.roster.find(p=>p.id===id),target=getStarters(s.roster).filter(p2=>p2.pos===p?.pos).sort((a,b)=>a.overall-b.overall)[0];if(!p||!target)result={ok:false,reason:'Não há titular da mesma posição para trocar.'};else{swapRosterPlayers(s.roster,p.id,target.id);if(s.tactics.captainId===target.id)s.tactics.captainId=null;sim.emit('tactic',`${p.name} entrou no lugar de ${target.name}.`);result={ok:true};}}
   else if(functions[name])result=functions[name]();else result={ok:false,reason:'Ação não reconhecida.'};
   if(applyResult(result)&&name==='round'){ui.close();focus(sim.state.facilities.stadium?'stadium':'arena');ui.toast('Partida oficial iniciada. Seu time é o azul.',6);}
   if(result?.ok&&['train','trainYouth'].includes(name)){ui.close();focus('training');}
  }
 },renderer);
 input=new WorldInput(renderer.canvas,document.getElementById('joystick'),(x,y)=>{
  const p=renderer.clickPosition(x,y);if(p.zone==='minimap')return;
  if(p.zone==='place'){
   const id=renderer.placement,result=sim.upgradeFacility(id,p.point);if(applyResult(result)){renderer.placement=null;renderer.selection={kind:'building',id};renderer.roadKey='';ui.inspectorKey='';}return;
  }
  if(p.zone==='world-select'){
   if(p.kind==='operation'){ui.open('upgrade-dialog');return;}
   if(p.kind==='travel'){ui.actions.travel(p.id);return;}
   renderer.selection={kind:p.kind,id:p.id};ui.inspectorKey='';ui.update(sim.state,true);return;
  }
  renderer.selection=null;if(!sim.goMap(p.point))ui.toast('Área fechada ou sem passagem. Toque na placa do terreno para expandir.',5);
 },()=>ui.paused||conflict,renderer);
 window.addEventListener('resize',()=>renderer.resize());
 document.addEventListener('visibilitychange',()=>{input.reset();lastTime=performance.now();accumulator=0;if(document.hidden&&store.writable)persist();});
 window.addEventListener('pagehide',()=>{if(store.writable)persist();});
 window.addEventListener('storage',e=>{if(e.key===store.saveKey&&e.newValue!==store.lastRaw){conflict=true;store.writable=false;input.reset();ui.open('menu-dialog');ui.saveStatus(false,'OUTRA ABA ALTEROU O SAVE');ui.toast('Feche a outra aba e recarregue. Seu progresso não será sobrescrito.',30);}});
 if(['new','unavailable','invalid'].includes(loaded.status))ui.open('welcome-dialog');else if(loaded.message)ui.toast(loaded.message,8);
 ui.update(sim.state,true);ui.saveStatus(store.writable);const step=1/60;
 function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(!ui.paused&&!document.hidden&&!conflict){accumulator+=dt;while(accumulator>=step){sim.tick(step,input.read());accumulator-=step;}if(sim.state.t-lastSaved>=CFG.autosaveSeconds){if(store.writable)persist();lastSaved=sim.state.t;}}else accumulator=0;
  const events=sim.drainEvents();renderer.addEvents(events);for(const e of events){ui.showEvent(e);if(['construction','trainingStart','ctDelivery'].includes(e.type))ui.toast(e.text,4);}
  if(now-lastUI>=150){ui.update(sim.state);lastUI=now;}
  if(now-lastDraw>=(renderer.lowQuality?1000/30:1000/60)-1){renderer.draw(sim.state,Math.min(.1,(now-lastDraw)/1000));lastDraw=now;}
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 // Only the explicitly requested debug query enables test hooks. No funds are
 // granted by this hook, and it is not enabled in distributed links.
 if(new URLSearchParams(location.search).get('debug')==='1')window.__arena={
  snapshot:()=>structuredClone(sim.state),goTo:zone=>{const p=zonePosition(zone);return p?sim.goTo(p):false;},
  step:seconds=>{if(ui.paused||conflict)throw new Error('Feche os menus.');if(!Number.isFinite(seconds)||seconds<0||seconds>120)throw new Error('Use até 120 segundos.');for(let i=0;i<Math.ceil(seconds*60);i++)sim.tick(step);const events=sim.drainEvents();renderer.addEvents(events);events.forEach(e=>ui.showEvent(e));ui.update(sim.state,true);renderer.draw(sim.state,.016);return structuredClone(sim.state);},
  save:()=>persist(),focus:id=>focus(id),rendererInfo:()=>({width:renderer.width,height:renderer.height,loaded:renderer.loaded,hits:renderer.hitZones,scale:renderer.scale,ox:renderer.ox,oy:renderer.oy,camera:renderer.mapCamera,selection:renderer.selection,placement:renderer.placement})
 };
}
boot().catch(error=>{console.error(error);document.getElementById('asset-loading').hidden=true;const card=document.createElement('section');card.className='fatal-error';const title=document.createElement('h1');title.textContent='Não foi possível abrir a arena.';const text=document.createElement('p');text.textContent=error.message||'Erro desconhecido.';card.append(title,text);document.body.append(card);});
