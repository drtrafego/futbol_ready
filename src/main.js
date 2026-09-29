import { CFG } from './config.js';
import { Simulation, newGame, currentMission, zonePosition } from './simulation.js';
import { SaveStore, encodeSave, decodeSave } from './save.js';
import { Renderer } from './render.js';
import { InputController } from './input.js';
import { UI } from './ui.js';
import { getProfileConfig, getActiveProfileId, setActiveProfileId } from './profile.js';
import { swapRosterPlayers, getStarters } from './roster.js';

async function boot() {
  const storage = { getItem: k => localStorage.getItem(k), setItem: (k, v) => localStorage.setItem(k, v), removeItem: k => localStorage.removeItem(k) };
  let prof = getProfileConfig();
  let store = new SaveStore(storage, prof.saveKey, prof.backupKey);
  let loaded = store.load();
  const sim = new Simulation(loaded.state), renderer = new Renderer(document.getElementById('game'));
  await renderer.ready;
  document.getElementById('asset-loading').hidden = true;
  let input, lastTime = performance.now(), accumulator = 0, lastSaved = sim.state.t, conflict = false, lastUI = 0, lastDraw = 0;
  const persist = (force = false) => {
    const result = store.save(sim.state, force);
    ui.saveStatus(result.ok);
    if (result.conflict) { conflict = true; ui.open('menu-dialog'); ui.toast(result.reason, 30); }
    else if (!result.ok && force) ui.toast(result.reason, 8);
    return result;
  };
  const ui = new UI({
    start: () => { input.reset(); lastTime = performance.now(); if (loaded.message) ui.toast(loaded.message, 9); },
    onPauseChange: () => { input?.reset(); accumulator = 0; lastTime = performance.now(); },
    travel: zone => { const point = zonePosition(zone); if (point) sim.goTo(point); },
    navigate: () => { const m = currentMission(sim.state), target = m?.zone ? zonePosition(m.zone) : null; if (target) sim.goTo(target); },
    toggleView: () => { renderer.overview = !renderer.overview; return renderer.overview; },
    toggleQuality: () => { renderer.lowQuality = !renderer.lowQuality; renderer.resize(); return renderer.lowQuality; },
    purchase: id => {
      const result = sim.purchase(id); if (!result.ok) ui.toast(result.reason, 6); else { ui.update(sim.state); persist(); ui.play('purchase'); }
    },
    export: () => {
      const blob = new Blob([encodeSave(sim.state)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `arena-save-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); ui.toast('Backup exportado. Guarde o arquivo JSON.', 5);
    },
    import: async text => {
      const next = decodeSave(text); sim.state = next; sim.events = []; renderer.particles = []; ui.lastMission = null; conflict = false;
      lastSaved = sim.state.t; input.reset(); const result = persist(true); ui.update(sim.state);
      ui.toast(result.ok ? 'Save importado com sucesso.' : 'Save importado na sessão. Exporte antes de fechar: o armazenamento falhou.', 8);
    },
    reset: () => {
      store.reset(); sim.state = newGame(); sim.events = []; renderer.particles = []; renderer.initialized = false; ui.lastMission = null;
      conflict = false; lastSaved = 0; input.reset(); persist(true); ui.update(sim.state); ui.open('welcome-dialog');
    },
    // Gestão Esportiva
    playRound: () => {
      const res = sim.playLeagueRound();
      if (!res.ok) { ui.toast(res.reason, 5); return; }
      ui.update(sim.state);
      persist();
      const pm = res.playerMatch;
      if (pm) {
        const won = pm.homeScore > pm.awayScore;
        const drawn = pm.homeScore === pm.awayScore;
        ui.toast(`Placar: ${pm.homeScore} x ${pm.awayScore} (${won ? 'Vitória! 🎉' : drawn ? 'Empate' : 'Derrota'})`, 6);
        ui.play(won ? 'goal' : 'match');
      }
    },
    nextSeason: () => {
      const res = sim.nextSeason();
      if (!res.ok) { ui.toast(res.reason, 5); return; }
      ui.update(sim.state);
      persist();
      ui.toast(res.reason, 8);
      ui.play('promotion');
    },
    trainPlayer: playerId => {
      const res = sim.trainPlayer(playerId);
      if (!res.ok) ui.toast(res.reason, 4);
      else { ui.update(sim.state); persist(); ui.play('training'); }
    },
    setCaptain: playerId => {
      sim.state.tactics.captainId = playerId;
      const player = sim.state.roster.find(j => j.id === playerId);
      ui.toast(`${player?.name || 'Jogador'} agora é o capitão do time! 👑`, 4);
      ui.update(sim.state);
      persist();
    },
    swapPlayers: playerId => {
      const player = sim.state.roster.find(j => j.id === playerId);
      if (!player) return;
      if (!player.starter) {
        const starters = getStarters(sim.state.roster);
        const samePos = starters.filter(j => j.pos === player.pos).sort((a, b) => a.overall - b.overall);
        const target = samePos[0] || starters.sort((a, b) => a.overall - b.overall)[0];
        if (target) {
          swapRosterPlayers(sim.state.roster, player.id, target.id);
          ui.toast(`${player.name} assumiu a titularidade (saiu ${target.name})!`, 4);
        }
      } else {
        ui.toast(`${player.name} já é titular.`, 3);
      }
      ui.update(sim.state);
      persist();
    },
    changeFormation: f => {
      sim.state.tactics.formation = f;
      ui.toast(`Formação alterada para ${f}.`, 3);
      ui.update(sim.state);
      persist();
    },
    changePosture: p => {
      sim.state.tactics.posture = p;
      ui.toast(`Postura alterada para ${p}.`, 3);
      ui.update(sim.state);
      persist();
    },
    scoutYouth: () => {
      const res = sim.scoutYouth();
      if (!res.ok) ui.toast(res.reason, 5);
      else { ui.update(sim.state); persist(); ui.play('promotion'); }
    },
    promoteYouth: id => {
      const res = sim.promoteYouth(id);
      if (!res.ok) ui.toast(res.reason, 5);
      else { ui.update(sim.state); persist(); ui.play('hire'); }
    },
    sellYouth: id => {
      const res = sim.sellYouth(id);
      if (!res.ok) ui.toast(res.reason, 5);
      else { ui.update(sim.state); persist(); ui.play('cash'); }
    },
    hireMarket: id => {
      const res = sim.hireMarket(id);
      if (!res.ok) ui.toast(res.reason, 5);
      else { ui.update(sim.state); persist(); ui.play('hire'); }
    },
    refreshMarket: () => {
      sim.refreshMarket();
      ui.toast('Mercado renovado com novas opções!', 4);
      ui.update(sim.state);
    },
    switchProfile: () => {
      persist(true);
      const currentId = getActiveProfileId();
      const nextId = currentId === 'bernardo' ? 'convidado' : 'bernardo';
      setActiveProfileId(nextId);
      prof = getProfileConfig(nextId);
      store = new SaveStore(storage, prof.saveKey, prof.backupKey);
      loaded = store.load();
      sim.state = loaded.state;
      sim.events = [];
      renderer.particles = [];
      ui.lastMission = null;
      conflict = false;
      lastSaved = sim.state.t;
      input.reset();
      ui.update(sim.state);
      ui.toast(`Perfil alterado para ${prof.name}!`, 6);
    },
  });
  document.getElementById('view-button').textContent=renderer.overview?'SEGUIR GERENTE':'VISÃO GERAL';
  input=new InputController(renderer.canvas,document.getElementById('joystick'),(x,y)=>{const p=renderer.clickPosition(x,y);if(p.zone==='office')ui.open('upgrade-dialog');else sim.goTo(p);},()=>ui.paused||conflict,(x,y)=>renderer.screenAxisToWorld(x,y));
  window.addEventListener('resize',()=>renderer.resize());
  document.addEventListener('visibilitychange',()=>{input.reset();lastTime=performance.now();accumulator=0;if(document.hidden&&store.writable)persist();});
  window.addEventListener('pagehide',()=>{if(store.writable)persist();});
  window.addEventListener('storage',event=>{
    if(event.key===CFG.saveKey&&event.newValue!==store.lastRaw){conflict=true;store.writable=false;input.reset();ui.open('menu-dialog');ui.saveStatus(false,'CONFLITO ENTRE ABAS · RECARREGUE');ui.toast('Outra aba alterou o save. Feche a outra aba e recarregue esta página para continuar.',30);}
  });
  if(['new','unavailable','invalid'].includes(loaded.status))ui.open('welcome-dialog');
  else if(loaded.message)ui.toast(loaded.message,10);
  if(location.protocol==='file:')ui.saveStatus(false,'ARQUIVO LOCAL · EXPORTE SEU BACKUP');
  else ui.saveStatus(store.writable);
  ui.update(sim.state);
  const step=1/60;
  function frame(now){
    const dt=Math.min(.1,Math.max(0,(now-lastTime)/1000));lastTime=now;
    if(!ui.paused&&!document.hidden&&!conflict){
      accumulator+=dt;
      while(accumulator>=step){sim.tick(step,input.read());accumulator-=step;}
      if(sim.state.t-lastSaved>=CFG.autosaveSeconds){if(store.writable)persist();lastSaved=sim.state.t;}
    }else accumulator=0;
    const events=sim.drainEvents();renderer.addEvents(events);for(const e of events)ui.play(e.type);
    if(now-lastUI>=120){ui.update(sim.state);lastUI=now;}
    const renderDelay=renderer.lowQuality?1000/30:1000/60;
    if(now-lastDraw>=renderDelay-1){renderer.draw(sim.state,Math.min(.1,(now-lastDraw)/1000));lastDraw=now;}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Ferramenta de teste deliberadamente opcional. Sem API, login ou moeda real nesta versão.
  if(new URLSearchParams(location.search).get('debug')==='1'){
    window.__arena={
      snapshot:()=>structuredClone(sim.state),
      goTo:zone=>{const p=zonePosition(zone);return p?sim.goTo(p):false;},
      step:seconds=>{
        if(ui.paused||conflict)throw new Error('Feche o menu antes de avançar a simulação.');
        if(!Number.isFinite(seconds)||seconds<0||seconds>120)throw new Error('Use de 0 a 120 segundos.');
        for(let i=0;i<Math.ceil(seconds*60);i++)sim.tick(step);
        ui.update(sim.state);renderer.addEvents(sim.drainEvents());renderer.draw(sim.state,.016);return structuredClone(sim.state);
      },
      save:()=>persist(),
      rendererInfo:()=>({width:renderer.width,height:renderer.height,scale:renderer.scale,overview:renderer.overview,loaded:renderer.loaded,assets:Object.keys(renderer.assets),hits:renderer.hitZones}),
    };
  }
}
boot().catch(error=>{
  document.getElementById('asset-loading').hidden=true;
  console.error(error);
  const card=document.createElement('section');card.className='fatal-error';
  const title=document.createElement('h1');title.textContent='Não foi possível iniciar o protótipo.';
  const text=document.createElement('p');text.textContent=`${error instanceof Error?error.message:'Erro desconhecido.'} Abra no Chrome ou Edge atualizado; para o código-fonte, use INICIAR-WINDOWS.cmd.`;
  card.append(title,text);document.body.append(card);
});
