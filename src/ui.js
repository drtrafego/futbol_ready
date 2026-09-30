import { CFG, UPGRADE_DEFS, MISSIONS } from './config.js';
import { currentMission, missionValue, carryCapacity, upgradeCost, upgradeLevel } from './simulation.js';
import { getDivision, sortTable, matchPerspective } from './competition.js';
import { calculateTeamStrength, calculateTrainingCost, getStarters, getReserves, playerSaleValue } from './roster.js';
import { FACILITIES, LAND_PLOTS, facilityStage, getFacilityCost } from './facilities.js';
import { getProfileConfig } from './profile.js';
export const formatNumber=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
export const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actionButton=(label,action,id='',disabled=false)=>`<button class="action-button" data-action="${action}" data-id="${escapeText(id)}" ${disabled?'disabled':''}>${label}</button>`;
export class UI{
 constructor(actions){
  this.actions=actions;this.lastMission=null;this.toastUntil=0;this.soundEnabled=false;this.audio=null;this.renderKey='';this.activeTab='team';
  this.dialogs=[...document.querySelectorAll('dialog')];this.nodes=Object.fromEntries(['wallet','carry','cash','matches','mission-title','mission-text','mission-progress','mission-count','navigate-button','save-status'].map(id=>[id,document.getElementById(id)]));
  const on=(id,fn)=>document.getElementById(id)?.addEventListener('click',fn);
  on('start-button',()=>{this.close();actions.start();});on('upgrade-button',()=>this.open('upgrade-dialog'));on('wallet-upgrades',()=>this.open('upgrade-dialog'));
  on('menu-button',()=>this.open('menu-dialog'));on('resume-button',()=>this.close());on('navigate-button',()=>actions.navigate());
  on('view-button',()=>{const overview=actions.toggleView();document.getElementById('view-button').textContent=overview?'SEGUIR GERENTE':'VISÃO GERAL';});
  on('district-button',()=>{this.close();actions.district('club');});on('arena-button',()=>{this.close();actions.district('arena');});
  on('quality-button',()=>{const low=actions.toggleQuality();document.getElementById('quality-button').textContent=`MODO ECONÔMICO: ${low?'SIM':'NÃO'}`;});
  on('sound-button',()=>{this.soundEnabled=!this.soundEnabled;document.getElementById('sound-button').textContent=`SOM: ${this.soundEnabled?'LIGADO':'DESLIGADO'}`;if(this.soundEnabled)this.play('cash');});
  on('export-button',()=>actions.export());on('import-button',()=>document.getElementById('import-file').click());on('logout-button',()=>actions.logout());
  on('reset-button',()=>{if(confirm('Recomeçar somente este perfil? Exporte seu save antes.'))actions.reset();});
  for(const [id,tab]of [['btn-dock-team','team'],['btn-dock-league','league'],['btn-dock-youth','youth'],['btn-dock-market','market'],['header-league-pill','league']])on(id,()=>this.openSports(tab));
  document.addEventListener('click',e=>{
   const target=e.target.closest('button');if(!target||target.disabled)return;
   if(target.hasAttribute('data-close')){target.closest('dialog').close();return;}
   if(target.dataset.travel){actions.travel(target.dataset.travel);return;}
   if(target.dataset.upgrade){actions.purchase(target.dataset.upgrade);return;}
   if(target.dataset.tab){this.openSports(target.dataset.tab);return;}
   if(target.dataset.look){this.close();actions.district(target.dataset.look);return;}
   if(target.dataset.action){let arg=target.dataset.id;if(target.dataset.action==='club'){arg={name:document.getElementById('club-name').value,sigla:document.getElementById('club-sigla').value};}actions.command(target.dataset.action,arg);}
  });
  document.addEventListener('change',e=>{if(e.target.id==='tactic-formation')actions.command('formation',e.target.value);if(e.target.id==='tactic-posture')actions.command('posture',e.target.value);});
  document.getElementById('import-file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>CFG.maxSaveBytes){this.toast('Arquivo grande demais. Limite: 600 KB.');return;}if(!confirm('Importar este save para o perfil atual?'))return;try{await actions.import(await file.text());}catch(error){this.toast(error.message,8);}});
  for(const d of this.dialogs){d.addEventListener('close',()=>actions.onPauseChange());d.addEventListener('cancel',e=>{if(d.id==='welcome-dialog')e.preventDefault();actions.onPauseChange();});}
  document.getElementById('upgrade-grid').innerHTML=UPGRADE_DEFS.map(d=>`<article class="upgrade-card"><div class="upgrade-icon">${d.icon}</div><h3>${d.name}<span id="level-${d.id}"></span></h3><p>${d.desc}</p><button id="buy-${d.id}" data-upgrade="${d.id}"></button></article>`).join('');
 }
 get paused(){return this.dialogs.some(d=>d.open);}
 close(){for(const d of this.dialogs)if(d.open)d.close();this.actions.onPauseChange();}
 open(id){this.close();document.getElementById(id).showModal();this.actions.onPauseChange();if(this.state)this.update(this.state,true);}
 openSports(tab='team'){this.activeTab=tab;this.renderKey='';this.open('sports-dialog');}
 toast(text,seconds=5){const n=document.getElementById('toast');n.textContent=text;n.hidden=false;this.toastUntil=performance.now()+seconds*1000;}
 showEvent(e){
  if(['goal','conceded','officialResult'].includes(e.type)){
   const n=document.getElementById('goal-alert');n.className=e.type==='goal'?'ours':e.type==='conceded'?'against':'result';n.textContent=e.text;n.hidden=false;this.goalUntil=performance.now()+5500;
  }
  if(['sale','hire','scout','training','facility','campaign','season'].includes(e.type))this.toast(e.text,5);
  this.play(e.type);
 }
 update(s,force=false){
  this.state=s;const n=this.nodes;n.wallet.textContent=formatNumber(s.wallet);n.carry.textContent=`${s.player.carry}/${carryCapacity(s)}`;n.cash.textContent=formatNumber(s.cashDesk);n.matches.textContent=formatNumber(s.stats.matches);
  document.getElementById('travel-field2').disabled=!s.fields[1].unlocked;document.getElementById('shop-wallet').textContent=formatNumber(s.wallet);
  document.getElementById('header-team-strength').textContent=`${getDivision(s.season.divisionIndex).name} · FORÇA ${calculateTeamStrength(s.roster,s.tactics.formation,s.tactics.posture,s.tactics.captainId,s.facilities.coaching)}`;
  document.getElementById('header-club').textContent=s.club.name;document.getElementById('active-profile-name').textContent=getProfileConfig().name;
  document.getElementById('preparation-status').textContent=`PREPARO ${s.preparation}/3`;
  const m=currentMission(s),index=m?MISSIONS.indexOf(m):MISSIONS.length;
  let title=m?.title||'Agora o clube vai crescer',text=m?.text||'Compre terrenos em CLUBE. Construa a base, o CT, o estádio e a sede. Cada instalação tem 5 fases.';
  if(!m&&!s.land.academy)text='Seu próximo passo: junte 500 moedas e compre o terreno da formação em CLUBE.';
  n['mission-title'].textContent=title;n['mission-text'].textContent=text;n['mission-count'].textContent=m?`${index+1}/${MISSIONS.length}`:'EXPANSÃO';
  n['mission-progress'].style.width=`${m?Math.min(100,missionValue(s,m.key)/m.target*100):100}%`;n['navigate-button'].disabled=false;
  for(const d of UPGRADE_DEFS){const cost=upgradeCost(s,d.id),level=upgradeLevel(s,d.id),b=document.getElementById('buy-'+d.id);b.disabled=cost===null||s.wallet<cost;b.textContent=cost===null?'CONCLUÍDO':`${formatNumber(cost)} MOEDAS`;document.getElementById('level-'+d.id).textContent=d.max>1?` · ${level}/${d.max}`:'';}
  if(this.lastMission!==null&&index>this.lastMission)this.toast('Etapa concluída. Vamos para a próxima!',3);this.lastMission=index;
  if(performance.now()>this.toastUntil)document.getElementById('toast').hidden=true;
  if(performance.now()>(this.goalUntil||0))document.getElementById('goal-alert').hidden=true;
  const key=`${this.activeTab}|${s.revision}|${s.wallet}|${s.season.currentRound}|${s.official?.cursor||0}`;
  if(document.getElementById('sports-dialog').open&&(force||key!==this.renderKey)){this.renderKey=key;this.renderSports(s);}
 }
 renderSports(s){
  const titles={team:'Elenco & Treinamento',league:'Campeonato & Resultados',youth:'Categoria de Base',market:'Mercado de Jogadores',facilities:'Construir & Evoluir',board:'Diretoria & Identidade',land:'Expansão do Clube'};
  document.getElementById('sports-title').textContent=titles[this.activeTab]||titles.facilities;
  document.getElementById('sports-meta').textContent=`${s.club.name} · ${formatNumber(s.wallet)} moedas · Preparo ${s.preparation}/3`;
  document.getElementById('sports-tabs').innerHTML=[['team','Elenco'],['league','Tabela'],['youth','Base'],['market','Mercado'],['facilities','Instalações'],['land','Terrenos'],['board','Diretoria']].map(([id,label])=>`<button data-tab="${id}" class="${this.activeTab===id?'active':''}">${label}</button>`).join('');
  const root=document.getElementById('sports-content');
  if(this.activeTab==='team')root.innerHTML=this.teamHTML(s);
  else if(this.activeTab==='league')root.innerHTML=this.leagueHTML(s);
  else if(this.activeTab==='youth')root.innerHTML=this.youthHTML(s);
  else if(this.activeTab==='market')root.innerHTML=`<div class="section-note">Contratados entram na reserva. Nenhum titular é apagado. Limite: 30 jogadores. Renovação custa 60 moedas. ${s.departmentTimers.market>0?`Aguarde ${Math.ceil(s.departmentTimers.market)}s com a arena aberta.`:''}</div>${actionButton('Renovar ofertas · 60 moedas','refresh','',s.wallet<60||s.departmentTimers.market>0)}<div class="sports-grid">${s.market.map(p=>`<article class="sports-card">${this.athleteHeader(p)}${actionButton(`Contratar · ${formatNumber(p.cost)} moedas`,'hire',p.id,s.wallet<p.cost||s.roster.length>=30)}</article>`).join('')}</div>`;
  else if(this.activeTab==='land')root.innerHTML=`<p class="section-note">A expansão começa depois de abrir o segundo campo. Terrenos são vizinhos: formação → estádio → sede.</p><div class="sports-grid">${LAND_PLOTS.filter(p=>p.id!=='home').map(p=>`<article class="sports-card"><span class="tag">${s.land[p.id]?'TERRENO ADQUIRIDO':'EXPANSÃO'}</span><h3>${p.name}</h3><p>${p.desc}</p>${actionButton(s.land[p.id]?'Adquirido':`Comprar · ${formatNumber(p.cost)} moedas`,'land',p.id,s.land[p.id]||!s.fields[1].unlocked||!s.land[p.requires]||s.wallet<p.cost)}</article>`).join('')}</div><button class="primary-button" data-look="club">VER TERRENOS NO MAPA ↗</button>`;
  else if(this.activeTab==='board')root.innerHTML=`<div class="section-note">A sede reduz em até 20% os custos de construção. Melhore Marketing para atrair torcedores e patrocinadores.</div><div class="club-form"><label>Nome do clube<input id="club-name" value="${escapeText(s.club.name)}" maxlength="30"></label><label>Sigla<input id="club-sigla" value="${escapeText(s.club.sigla)}" maxlength="4"></label>${actionButton('Salvar identidade','club')}</div><div class="sports-grid">${['board','marketing','coaching'].map(id=>this.facilityHTML(s,id)).join('')}</div>${actionButton('Campanha de torcida · 100 moedas / 2 minutos','campaign','',!s.facilities.marketing||s.wallet<100||s.departmentTimers.campaign>0)}`;
  else root.innerHTML=`<p class="section-note">Cada espaço tem 5 fases, com 3 melhorias em cada fase. A partir da fase 3 surgem estruturas maiores, coberturas e iluminação.</p><div class="sports-grid">${Object.keys(FACILITIES).map(id=>this.facilityHTML(s,id)).join('')}</div>`;
 }
 athleteHeader(p){return `<div class="card-top"><span class="tag">${escapeText(p.pos)}</span><small>${p.age} anos</small></div><h3>${escapeText(p.name)}</h3><div class="rating"><b>${p.overall}</b><span>FORÇA<br>Potencial ${p.potential}</span></div>`;}
 teamHTML(s){const captain=s.roster.find(p=>p.id===s.tactics.captainId);const card=p=>`<article class="sports-card ${p.id===s.tactics.captainId?'captain':''}">${this.athleteHeader(p)}<div class="card-actions">${actionButton(`Treinar · ${calculateTrainingCost(p,s.facilities.training)}`,'train',p.id,p.overall>=p.potential||s.wallet<calculateTrainingCost(p,s.facilities.training))}${p.starter?actionButton(p.id===s.tactics.captainId?'Capitão ✓':'Dar faixa','captain',p.id):actionButton('Escalar ⇄','sub',p.id)}${!p.starter?actionButton(`Vender · +${playerSaleValue(p)}`,'sell',p.id):''}</div></article>`;
  return `<div class="tactics"><label>Formação<select id="tactic-formation">${['4-4-2','4-3-3','3-5-2','5-3-2'].map(f=>`<option ${f===s.tactics.formation?'selected':''}>${f}</option>`).join('')}</select></label><label>Postura<select id="tactic-posture">${['equilibrada','ofensiva','defensiva'].map(f=>`<option ${f===s.tactics.posture?'selected':''}>${f}</option>`).join('')}</select></label><p>Capitão: <b>${escapeText(captain?.name||'Escolha um titular')}</b></p></div><p class="section-note">A formação reorganiza a escalação; a força dos titulares afeta os gols e os resultados. CT reduz custo de treino.</p><h3>11 titulares</h3><div class="sports-grid">${getStarters(s.roster).map(card).join('')}</div><h3>Reservas (${getReserves(s.roster).length})</h3><div class="sports-grid">${getReserves(s.roster).map(card).join('')}</div>`;
 }
 youthHTML(s){return `<div class="section-note">O campo da base funciona no terreno da formação. Revele talentos, treine, promova ou venda. Cada promoção preserva o elenco existente.</div><div class="sports-grid">${this.facilityHTML(s,'youth')}${this.facilityHTML(s,'training')}</div><div class="inline-actions">${actionButton(s.departmentTimers.scout>0?`Nova peneira em ${Math.ceil(s.departmentTimers.scout)}s de jogo`:'Organizar peneira','scout','',!s.facilities.youth||s.departmentTimers.scout>0)}<button class="action-button" data-look="youth">VISITAR CAMPO DA BASE ↗</button></div><div class="sports-grid">${s.youthList.length?s.youthList.map(p=>`<article class="sports-card">${this.athleteHeader(p)}${actionButton(`Treinar · ${calculateTrainingCost(p,s.facilities.training+s.facilities.youth)}`,'trainYouth',p.id,p.overall>=p.potential||s.wallet<calculateTrainingCost(p,s.facilities.training+s.facilities.youth))}${actionButton('Promover ao profissional','promote',p.id,s.roster.length>=30)}${actionButton(`Vender · +${formatNumber(p.marketValue)}`,'sellYouth',p.id)}</article>`).join(''):'<p>Nenhuma promessa na base. Construa o campo e organize a primeira peneira.</p>'}</div>`;}
 facilityHTML(s,id){const f=FACILITIES[id],l=s.facilities[id],stage=facilityStage(l),cost=getFacilityCost(id,l,s.facilities.board),land=s.land[f.plot],locked=!land||(id==='pitch2'&&!s.fields[1].unlocked)||s.season.divisionIndex<f.minDivision;
  return `<article class="sports-card"><span class="tag">${stage.built?`FASE ${stage.phase} · MELHORIA ${stage.step}/3`:'TERRENO PARA CONSTRUIR'}</span><h3>${f.icon} ${f.name}</h3><p>${f.desc}</p><div class="phase-track">${Array.from({length:5},(_,i)=>`<i class="${stage.built&&i<stage.phase?'filled':''}"></i>`).join('')}</div>${actionButton(stage.maxed?'Todas as fases concluídas':!land?'Compre o terreno':s.season.divisionIndex<f.minDivision?'Exige Série C':`${l?'Melhorar':'Construir'} · ${formatNumber(cost)} moedas`,'facility',id,locked||stage.maxed||s.wallet<cost)}<button class="look-link" data-look="${id}">Ver no cenário ↗</button></article>`;
 }
 leagueHTML(s){const div=getDivision(s.season.divisionIndex),sorted=sortTable(s.season.clubs),round=s.season.rounds[s.season.currentRound-1],pm=round?.matches.find(m=>m.homeId==='player'||m.awayId==='player'),h=s.season.clubs.find(c=>c.id===pm?.homeId),a=s.season.clubs.find(c=>c.id===pm?.awayId);
  const rows=sorted.map((c,i)=>`<tr class="${c.isPlayer?'our-row':''}"><td>${i+1}</td><td>${escapeText(c.name)}${c.isPlayer?' <b>VOCÊ</b>':''}</td><td>${c.played}</td><td>${c.won}</td><td>${c.drawn}</td><td>${c.lost}</td><td>${c.goalsFor}</td><td>${c.goalsAgainst}</td><td>${c.goalDiff}</td><td><b>${c.points}</b></td></tr>`).join('');
  const results=s.season.rounds.filter(r=>r.played).slice(-4).reverse().map(r=>`<details open><summary>Rodada ${r.roundNumber}</summary>${r.matches.map(m=>{const home=s.season.clubs.find(c=>c.id===m.homeId),away=s.season.clubs.find(c=>c.id===m.awayId),p=matchPerspective({...m,homeName:home.name,awayName:away.name});return `<div class="result-row"><span>${escapeText(home.name)}${m.homeId==='player'?' (VOCÊ)':''}</span><b>${m.homeScore} × ${m.awayScore}</b><span>${escapeText(away.name)}${m.awayId==='player'?' (VOCÊ)':''}</span>${m.homeId==='player'||m.awayId==='player'?`<small>${p.result==='win'?'VITÓRIA':p.result==='draw'?'EMPATE':'DERROTA'}</small>`:''}</div>`;}).join('')}</details>`).join('');
  return `<div class="section-note"><b>${div.name} · Rodada ${s.season.currentRound}/${s.season.totalRounds}</b><p>${s.official?'Partida oficial em andamento. Volte ao campo para acompanhar.':s.season.finished?'Temporada concluída. Confira a posição final antes de avançar.':`${escapeText(h?.name)} ${pm?.homeId==='player'?'(VOCÊ)':''} × ${escapeText(a?.name)} ${pm?.awayId==='player'?'(VOCÊ)':''}`}</p>1 preparo por rodada oficial. Partidas locais geram preparo; só oficiais alteram a tabela. ${!s.official&&s.fields[0].remaining>0?'Feche este painel e aguarde a partida local acabar antes de iniciar a rodada.':''}</div><div class="inline-actions">${s.season.finished?actionButton('Concluir temporada e receber prêmio','season'):actionButton(s.official?'Partida em andamento':'Jogar rodada · 1 preparo','round','',s.preparation<1||!!s.official||s.fields[0].remaining>0)}<button class="action-button" data-look="${s.facilities.stadium?'stadium':'arena'}">VER CAMPO ↗</button></div><div class="table-scroll"><table><thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>PTS</th></tr></thead><tbody>${rows}</tbody></table></div><p class="section-note">Os dois primeiros sobem, exceto na divisão máxima. Os dois últimos descem, exceto na Série D. Campeão é somente o primeiro colocado.</p><h3>Resultados das rodadas</h3>${results||'<p>Nenhuma rodada oficial concluída.</p>'}<h3>Histórico de temporadas</h3>${s.career.history.length?s.career.history.map(h=>`<details><summary>Temporada ${h.number} · ${getDivision(h.division).name} · ${h.playerPos}º lugar</summary><p>Campeão: ${escapeText(h.champion)} · Prêmio: ${formatNumber(h.reward)}</p>${h.results.map(r=>`<p>${escapeText(r.homeName)} ${r.homeScore} × ${r.awayScore} ${escapeText(r.awayName)}</p>`).join('')}</details>`).join(''):'<p>Seu histórico aparecerá ao concluir a primeira temporada.</p>'}`;
 }
 saveStatus(ok,text=''){const n=this.nodes['save-status'];n.textContent=text||(ok?'PROGRESSO SALVO NESTE NAVEGADOR':'NÃO SALVOU · EXPORTE UM BACKUP');n.classList.toggle('saved-warn',!ok);}
 play(type){
  if(!this.soundEnabled||!['cash','purchase','goal','conceded','start','hire','training','promotion','officialResult'].includes(type))return;
  try{this.audio??=new AudioContext();if(this.audio.state==='suspended')void this.audio.resume();const now=this.audio.currentTime;
   const notes=type==='goal'?[523,659,784,1046]:type==='conceded'?[330,247]:[{cash:700,purchase:980,start:850,hire:880,training:740,promotion:920}[type]||600];
   notes.forEach((freq,i)=>{const o=this.audio.createOscillator(),g=this.audio.createGain(),at=now+i*.14;o.frequency.value=freq;o.type=type==='goal'?'triangle':'sine';g.gain.setValueAtTime(.04,at);g.gain.exponentialRampToValueAtTime(.001,at+.23);o.connect(g);g.connect(this.audio.destination);o.start(at);o.stop(at+.24);});
   if(['goal','conceded'].includes(type)&&'speechSynthesis'in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(type==='goal'?'É goool! Gol do nosso time!':'Gol sofrido. Gol do adversário.');utterance.lang='pt-BR';utterance.rate=1.1;utterance.volume=.65;speechSynthesis.speak(utterance);}
  }catch{this.soundEnabled=false;}
 }
}
