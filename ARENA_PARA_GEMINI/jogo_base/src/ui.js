import { CFG, UPGRADE_DEFS, MISSIONS } from './config.js';
import { currentMission, missionValue, carryCapacity, upgradeCost, upgradeLevel } from './simulation.js';

export const formatNumber = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(n);

export class UI {
  constructor(actions) {
    this.actions=actions;this.lastMission=null;this.toastUntil=0;this.soundEnabled=false;this.audio=null;
    this.dialogs=[...document.querySelectorAll('dialog')];
    this.nodes=Object.fromEntries(['wallet','carry','cash','matches','mission-title','mission-text','mission-progress','mission-count','navigate-button','save-status'].map(id=>[id,document.getElementById(id)]));
    const click=(id,fn)=>document.getElementById(id).addEventListener('click',fn);
    click('start-button',()=>{document.getElementById('welcome-dialog').close();actions.start();});
    click('upgrade-button',()=>this.open('upgrade-dialog'));
    click('wallet-upgrades',()=>this.open('upgrade-dialog'));
    document.querySelector('.travel-dock').addEventListener('click',e=>{const b=e.target.closest('[data-travel]');if(b&&!b.disabled)actions.travel(b.dataset.travel);});
    click('menu-button',()=>this.open('menu-dialog'));
    click('resume-button',()=>document.getElementById('menu-dialog').close());
    click('navigate-button',()=>actions.navigate());
    click('view-button',()=>{const overview=actions.toggleView();document.getElementById('view-button').textContent=overview?'SEGUIR GERENTE':'VISÃO GERAL';});
    click('quality-button',()=>{const low=actions.toggleQuality();document.getElementById('quality-button').textContent=`MODO ECONÔMICO: ${low?'SIM':'NÃO'}`;});
    click('sound-button',()=>{
      this.soundEnabled=!this.soundEnabled;
      document.getElementById('sound-button').textContent=`SOM: ${this.soundEnabled?'LIGADO':'DESLIGADO'}`;
      if(this.soundEnabled)this.play('cash');
    });
    click('export-button',()=>actions.export());
    click('import-button',()=>document.getElementById('import-file').click());
    click('reset-button',()=>{if(confirm('Apagar o progresso local e começar de novo? Exporte um backup antes de confirmar.'))actions.reset();});
    document.getElementById('import-file').addEventListener('change',async e=>{
      const file=e.target.files?.[0];e.target.value='';
      if(!file)return;
      if(file.size>CFG.maxSaveBytes){this.toast('Arquivo grande demais. Limite: 180 KB.',8);return;}
      if(!confirm('Substituir a sessão atual pelo save selecionado?'))return;
      try{await actions.import(await file.text());}catch(error){this.toast(error instanceof Error?error.message:'Não foi possível ler o save.',8);}
    });
    for(const button of document.querySelectorAll('[data-close]'))button.addEventListener('click',()=>button.closest('dialog').close());
    for(const dialog of this.dialogs){
      dialog.addEventListener('close',()=>actions.onPauseChange());
      dialog.addEventListener('cancel',e=>{if(dialog.id==='welcome-dialog'){e.preventDefault();return;}actions.onPauseChange();});
    }
    document.getElementById('upgrade-grid').innerHTML=UPGRADE_DEFS.map(d=>`<article class="upgrade-card"><div class="upgrade-icon" aria-hidden="true">${d.icon}</div><h3>${d.name}<span class="upgrade-level" id="level-${d.id}"></span></h3><p>${d.desc}</p><button id="buy-${d.id}" data-upgrade="${d.id}"></button></article>`).join('');
    document.getElementById('upgrade-grid').addEventListener('click',e=>{const button=e.target.closest('[data-upgrade]');if(button&&!button.disabled)actions.purchase(button.dataset.upgrade);});
  }
  get paused(){return this.dialogs.some(d=>d.open);}
  open(id){for(const d of this.dialogs)if(d.open)d.close();document.getElementById(id).showModal();this.actions.onPauseChange();}
  toast(message,seconds=4){const node=document.getElementById('toast');node.textContent=message;node.hidden=false;this.toastUntil=performance.now()+seconds*1000;}
  update(s){
    document.getElementById('travel-field2').disabled=!s.fields[1].unlocked;
    this.nodes.wallet.textContent=formatNumber(s.wallet);this.nodes.carry.textContent=`${s.player.carry}/${carryCapacity(s)}`;
    this.nodes.cash.textContent=formatNumber(s.cashDesk);this.nodes.matches.textContent=formatNumber(s.stats.matches);
    document.getElementById('shop-wallet').textContent=formatNumber(s.wallet);
    const mission=currentMission(s),index=mission?MISSIONS.indexOf(mission):MISSIONS.length;
    this.nodes['mission-title'].textContent=mission?.title||'O bairro ganhou uma arena!';
    this.nodes['mission-text'].textContent=mission?.text||'Sua equipe cuida da operação. Melhore as arquibancadas e continue fazendo a arena crescer.';
    this.nodes['mission-count'].textContent=`${Math.min(index+1,MISSIONS.length)}/${MISSIONS.length}`;
    this.nodes['mission-progress'].style.width=`${mission?Math.min(100,missionValue(s,mission.key)/mission.target*100):100}%`;
    this.nodes['navigate-button'].disabled=!mission?.zone;
    for(const def of UPGRADE_DEFS){
      const cost=upgradeCost(s,def.id),level=upgradeLevel(s,def.id),button=document.getElementById(`buy-${def.id}`);
      document.getElementById(`level-${def.id}`).textContent=def.max>1?` ${level}/${def.max}`:'';
      button.disabled=cost===null||s.wallet<cost;
      button.textContent=cost===null?'CONCLUÍDO':`${formatNumber(cost)} MOEDAS${s.wallet<cost?' · FALTAM '+formatNumber(cost-s.wallet):' · COMPRAR'}`;
    }
    if(this.lastMission!==null&&index>this.lastMission)this.toast('Etapa concluída. Vamos para a próxima!',3);
    this.lastMission=index;
    if(performance.now()>this.toastUntil)document.getElementById('toast').hidden=true;
  }
  saveStatus(ok,text=''){const node=this.nodes['save-status'];node.textContent=text||(ok?'SALVO NESTE NAVEGADOR':'SAVE INDISPONÍVEL · EXPORTE BACKUP');node.classList.toggle('saved-warn',!ok);}
  play(type){
    if(!this.soundEnabled||!['cash','purchase','goal','start'].includes(type))return;
    try{
      this.audio??=new AudioContext();if(this.audio.state==='suspended')void this.audio.resume();
      const osc=this.audio.createOscillator(),gain=this.audio.createGain(),now=this.audio.currentTime;
      const base={cash:700,purchase:980,goal:540,start:850}[type];
      osc.type='sine';osc.frequency.setValueAtTime(base,now);osc.frequency.exponentialRampToValueAtTime(base*1.4,now+.12);
      gain.gain.setValueAtTime(.045,now);gain.gain.exponentialRampToValueAtTime(.001,now+.2);osc.connect(gain);gain.connect(this.audio.destination);osc.start(now);osc.stop(now+.21);
    }catch{this.soundEnabled=false;this.toast('Áudio indisponível neste navegador.');}
  }
}
