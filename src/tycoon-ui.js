import { WorldUI } from './world-ui.js';
import { escapeText, formatNumber } from './ui.js';
import { getStarters, getReserves } from './roster.js';
import { trainingQuote } from './world-simulation.js';
import { FACILITIES, facilityStage } from './facilities.js';
import { ensureTycoon, CLUB_CONTRACTS, TYCOON_GOALS, clubObjective, partnerProgress } from './tycoon-model.js';
import { athleteSellQuote, academyIntakeQuote, restaurantPrice, restaurantCapacity, restaurantSupplyQuote } from './tycoon-economy.js';
import { stadiumSeats, tycoonVenue } from './tycoon-simulation.js';

const tcButton=(label,action,id='',disabled=false,cls='')=>`<button type="button" class="action-button ${cls}" data-action="${action}" data-id="${escapeText(id)}" ${disabled?'disabled':''}>${label}</button>`;
export class TycoonUI extends WorldUI {
  constructor(actions,renderer){
    super(actions,renderer);document.title='Arena de Bairro · Clube Vivo 0.6';this.gestureDown=false;this.lastFoodStatus='';
    const dock=document.querySelector('.sports-dock')||document.querySelector('.travel-dock');
    if(dock){const b=document.createElement('button');b.type='button';b.dataset.tab='life';b.textContent='Clube vivo';dock.append(b);}
    const note=document.createElement('section');note.className='tycoon-operation-note';
    note.innerHTML='<b>Este painel é apenas a operação inicial.</b><p>Terrenos, lanchonete, CT, base, estádio e departamentos evoluem no próprio mapa.</p>'+tcButton('VER A PRÓXIMA CONQUISTA →','tycoon:goObjective');
    document.getElementById('upgrade-grid').before(note);
    const claim=document.createElement('button');claim.type='button';claim.id='tycoon-claim';claim.dataset.action='tycoon:claim';claim.className='tycoon-claim';claim.hidden=true;
    document.querySelector('.mission-card').append(claim);
    document.addEventListener('pointerdown',e=>{if(e.target.closest('dialog,#world-inspector'))this.gestureDown=true;},true);
    window.addEventListener('pointerup',()=>{this.gestureDown=false;this.renderKey='';this.inspectorKey='';},true);
    window.addEventListener('pointercancel',()=>{this.gestureDown=false;},true);
    window.addEventListener('blur',()=>{this.gestureDown=false;},true);
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
      if(b.dataset.action==='tycoon:goObjective'){e.preventDefault();e.stopImmediatePropagation();this.goObjective();}
      if(b.dataset.action==='tycoon:share'){e.preventDefault();e.stopImmediatePropagation();void this.exportClubCard(b.dataset.id);}
    },true);
    document.getElementById('navigate-button').addEventListener('click',e=>{e.stopImmediatePropagation();this.goObjective();},true);
  }
  get paused(){return this.dialogs.some(d=>d.open && d.id!=='sports-dialog');}
  get inputBlocked(){return this.dialogs.some(d=>d.open);}
  goObjective(){
    if(!this.state)return;const g=clubObjective(this.state);let focus=g.focus;if(focus==='field0'&&this.state.player.carry<1)focus='supply';this.close();
    if(focus==='league')this.openSports('league');
    else if(focus==='operation')this.open('upgrade-dialog');
    else if(['supply','field0','gate','cash'].includes(focus))this.actions.travel(focus);
    else this.actions.focus(focus);
  }
  showEvent(e){
    const independent=this.state?.tycoon?.stadium.match;
    if(['goal','conceded'].includes(e.type)&&(independent||performance.now()<(this.officialAlertUntil||0)))return;
    if(['stadiumGoal','stadiumConceded','stadiumResult'].includes(e.type))this.officialAlertUntil=performance.now()+5000;
    const types={stadiumGoal:'goal',stadiumConceded:'conceded',stadiumResult:'officialResult',stadiumStart:'start'};
    super.showEvent({...e,type:types[e.type]||e.type});
    if(['milestone','contract','foodOrder','foodDelivery','newEra','warning'].includes(e.type))this.toast(e.text,7);
  }
  update(s,force=false){
    ensureTycoon(s);super.update(s,force);
    const g=clubObjective(s),idx=TYCOON_GOALS.findIndex(x=>x.id===g.id);
    this.nodes['mission-title'].textContent=g.title;this.nodes['mission-text'].textContent=g.text;
    this.nodes['mission-count'].textContent=idx<0?'NOVA TEMPORADA':`${idx+1}/${TYCOON_GOALS.length}`;
    this.nodes['mission-progress'].style.width=`${Math.min(100,g.value/g.target*100)}%`;
    const claim=document.getElementById('tycoon-claim');if(claim){const done=this.state.tycoon.claimed.includes(g.id);claim.hidden=!g.complete||done;claim.disabled=!g.complete||done;claim.textContent=`RECEBER ${g.reward} MOEDAS ✓`;}
    this.nodes['navigate-button'].hidden=g.complete&&!s.tycoon.claimed.includes(g.id);
    document.getElementById('upgrade-button').innerHTML='<span>↗</span> OPERAÇÃO';
    if(s.tycoon.stadium.match){const m=s.tycoon.stadium.match;document.getElementById('preparation-status').textContent=m.phase==='admission'?'TORCIDA ENTRANDO':`OFICIAL ${m.score[0]} × ${m.score[1]}`;}
    for(const food of document.querySelectorAll('[data-tycoon-food-live]'))food.textContent=`${s.tycoon.canteen.stock}/${restaurantCapacity(s)} lanches · ${s.tycoon.canteen.guests.length} clientes · ${s.tycoon.counters.served} atendidos`;
    const progress=document.getElementById('tycoon-contract-progress');if(progress){const p=partnerProgress(s);progress.textContent=p?`${p.value}/${p.target} · ${p.complete?'PRONTO PARA RECEBER':'EM ANDAMENTO'}`:'';}
  }
  renderSports(s){
    const focused=document.activeElement;
    if(this.gestureDown || (focused && /INPUT|TEXTAREA|SELECT/.test(focused.tagName) && focused.closest('#sports-content'))){this.renderKey='';return;}
    const titles={team:'Elenco & Treinamento',league:'Campeonato & Resultados',youth:'Categoria de Base',market:'Mercado de Jogadores',board:'Diretoria & Identidade',life:'Clube vivo · Operação e conquistas'};
    document.getElementById('sports-title').textContent=titles[this.activeTab]||'Instalações do clube';
    document.getElementById('sports-meta').textContent=`${s.club.name} · ${formatNumber(s.wallet)} moedas · Preparo ${s.preparation}/3`;
    this.patchHTML(document.getElementById('sports-tabs'),[['team','Elenco'],['league','Tabela'],['youth','Base'],['market','Mercado'],['facilities','Instalações'],['land','Terrenos'],['board','Diretoria'],['life','Clube vivo']].map(([id,label])=>`<button data-tab="${id}" class="${this.activeTab===id?'active':''}">${label}</button>`).join(''));
    let html='';
    if(this.activeTab==='team')html=this.teamHTML(s);
    else if(this.activeTab==='youth')html=this.youthHTML(s);
    else if(this.activeTab==='league')html=this.leagueHTML(s);
    else if(this.activeTab==='life')html=this.lifeHTML(s);
    else if(this.activeTab==='market')html=`<p class="tycoon-info">Mercado reequilibrado: comprar e revender sem desenvolver gera prejuízo. O atleta é avaliado pelos atributos, não pelo botão usado para transferi-lo.</p><p>Contratados chegam à reserva. Limite: 30 jogadores. ${s.departmentTimers.market>0?`Renovação em ${Math.ceil(s.departmentTimers.market)}s de jogo.`:''}</p>${tcButton('Renovar ofertas · 60 moedas','refresh','',s.wallet<60||s.departmentTimers.market>0)}<div class="sports-grid">${s.market.map(p=>`<article class="sports-card">${this.athleteHeader(p)}${tcButton(`Contratar · ${formatNumber(p.cost)} moedas`,'hire',p.id,s.wallet<p.cost||s.roster.length>=30)}</article>`).join('')}</div>`;
    else if(this.activeTab==='board')html=`<div class="sports-grid">${['board','marketing','coaching'].map(id=>this.facilityHTML(s,id)).join('')}</div><h3>Identidade do clube</h3><div class="tactics"><label>Nome<input id="club-name" maxlength="30" value="${escapeText(s.club.name)}"></label><label>Sigla<input id="club-sigla" maxlength="4" value="${escapeText(s.club.sigla)}"></label>${tcButton('Salvar identidade','club')}</div><h3>Marketing do clube</h3><p>Campanha temporária traz mais procura por 2 minutos de jogo. Invista também na capacidade de atendimento.</p>${tcButton(s.departmentTimers.campaign>0?'Campanha ativa':'Iniciar campanha · 100 moedas','campaign','',s.departmentTimers.campaign>0||!s.facilities.marketing||s.wallet<100)}${this.partnersHTML(s)}`;
    else html=`<p>Selecione as instalações e terrenos diretamente no mapa.</p><div class="sports-grid">${Object.keys(FACILITIES).map(id=>this.facilityHTML(s,id)).join('')}</div>`;
    this.patchHTML(document.getElementById('sports-content'),'<p class="tycoon-live-note">● O clube continua funcionando enquanto você administra. O menu de pausa interrompe o jogo.</p>'+html);
  }
  patchHTML(root,html){
    // A tiny, local DOM reconciler preserves button identity and focus while
    // money/timers change. Delegated handlers remain attached to document.
    if(root.dataset.tycoonHtml===html)return;
    const template=document.createElement('template');template.innerHTML=html;
    const patch=(parent,wanted)=>{
      const target=[...wanted.childNodes];
      for(let i=0;i<target.length;i++){
        const fresh=target[i];let live=parent.childNodes[i];
        if(!live){parent.append(fresh.cloneNode(true));continue;}
        if(live.nodeType!==fresh.nodeType||live.nodeName!==fresh.nodeName){live.replaceWith(fresh.cloneNode(true));continue;}
        if(live.nodeType===3){if(live.nodeValue!==fresh.nodeValue)live.nodeValue=fresh.nodeValue;continue;}
        if(live.nodeType!==1)continue;
        for(const a of [...live.attributes])if(!fresh.hasAttribute(a.name)&&!(a.name==='open'&&live.tagName==='DETAILS'))live.removeAttribute(a.name);
        for(const a of [...fresh.attributes])if(!(a.name==='open'&&live.tagName==='DETAILS')&&live.getAttribute(a.name)!==a.value)live.setAttribute(a.name,a.value);
        patch(live,fresh);
      }
      while(parent.childNodes.length>target.length)parent.lastChild.remove();
    };
    patch(root,template.content);root.dataset.tycoonHtml=html;
  }
  renderInspector(s,force=false){
    if(this.gestureDown){this.inspectorKey='';return;}
    super.renderInspector(s,force);
    const r=this.worldRenderer,root=document.querySelector('.world-inspector-body');if(!r||!root)return;
    if(r.selection?.kind==='building'&&r.selection.id==='canteen'&&!r.placement){
      let box=root.querySelector('.tycoon-canteen-tools');if(!box){box=document.createElement('section');box.className='tycoon-canteen-tools';root.append(box);}
      const c=s.tycoon.canteen,key=JSON.stringify([c.stock,!!c.shipment,c.cook,c.autoRestock,c.guests.length,s.wallet,s.facilities.canteen,s.map.construction.length]);
      if(box.dataset.key!==key){box.dataset.key=key;this.patchHTML(box,this.canteenHTML(s));}
    }
    if(r.selection?.kind==='building'&&r.selection.id==='stadium'&&!root.querySelector('.tycoon-venue-note'))root.insertAdjacentHTML('beforeend','<p class="tycoon-venue-note">O estádio tem placar e bilheteria próprios. Partidas locais continuam na arena durante o jogo oficial. Fora de casa não há receita de ingressos.</p>');
  }
  athleteHeader(p){
    const b=this.state?.tycoon?.people[p.id];return super.athleteHeader(p)+(b?`<p class="tycoon-player-story">${b.origin==='base'?'🌱 FORMADO NA BASE':b.origin==='market'?'🤝 CONTRATADO':'⚽ ATLETA DO CLUBE'}<br>${b.played} jogos oficiais · ${b.goals} gols · ${b.trainings} evoluções<br><small>Histórico registrado desde a atualização 0.6</small></p>`:'');
  }
  teamHTML(s){
    const locked=!!(s.official||s.tycoon.stadium.match),cap=s.roster.find(p=>p.id===s.tactics.captainId),team=trainingQuote(s,'team');
    const card=p=>{const q=trainingQuote(s,'player',p.id),bio=s.tycoon.people[p.id];return `<article class="sports-card">${this.athleteHeader(p)}<div class="card-actions">${tcButton(`Treinar · ${q.coins} moedas + 1 kit`,'train',p.id,locked||!q.ok)}${p.starter?tcButton(p.id===s.tactics.captainId?'Capitão ✓':'Dar faixa','captain',p.id,locked):tcButton('Escalar ⇄','sub',p.id,locked)}${!p.starter?tcButton(`Vender · +${athleteSellQuote(p)}`,'sell',p.id,s.map.training?.ids.includes(p.id)):''}${tcButton('Cartão do atleta ↗','tycoon:share',p.id)}</div>${bio?.events.length?`<details><summary>História no clube</summary>${bio.events.map(e=>`<p>${escapeText(e.text)}</p>`).join('')}</details>`:''}</article>`;};
    return `<section class="training-resources"><b>Desenvolvimento com moedas, kits e tempo</b><p>CT: ${s.map.ctKits} kits. ${escapeText(locked?'Partida oficial em andamento.':team.reason||'Os titulares podem treinar.')}</p>${tcButton(`Treinar titulares · ${team.coins} moedas + ${team.kits} kits`,'tycoon:teamTraining','',locked||!team.ok)}<button class="action-button" data-look="training">VER E ABASTECER O CT ↗</button></section><div class="tactics"><label>Formação<select id="tactic-formation" ${locked?'disabled':''}>${['4-4-2','4-3-3','3-5-2','5-3-2'].map(f=>`<option ${f===s.tactics.formation?'selected':''}>${f}</option>`).join('')}</select></label><label>Postura<select id="tactic-posture" ${locked?'disabled':''}>${['equilibrada','ofensiva','defensiva'].map(f=>`<option ${f===s.tactics.posture?'selected':''}>${f}</option>`).join('')}</select></label><p>Capitão: <b>${escapeText(cap?.name||'Nenhum')}</b></p></div><h3>Titulares</h3><div class="sports-grid">${getStarters(s.roster).map(card).join('')}</div><h3>Reservas (${getReserves(s.roster).length})</h3><div class="sports-grid">${getReserves(s.roster).map(card).join('')}</div><section class="team-footer-actions">${tcButton('Reiniciar carreira mantendo os atletas','resetTeam','',locked||!!s.map.training)}</section>`;
  }
  youthHTML(s){
    const cost=academyIntakeQuote(s),locked=!!(s.official||s.tycoon.stadium.match);
    return `<p class="tycoon-info">O jovem conserva sua história e seu valor de venda ao ser promovido. Treinar melhora os atributos; jogos registram partidas e gols. Promover sozinho não cria moedas.</p><div class="sports-grid">${this.facilityHTML(s,'youth')}${this.facilityHTML(s,'training')}</div><div class="inline-actions">${tcButton(`Organizar peneira · ${formatNumber(cost)} moedas`,'scout','',!s.facilities.youth||s.wallet<cost||s.departmentTimers.scout>0)}<button class="action-button" data-look="youth">VER CAMPO DA BASE ↗</button></div><div class="sports-grid">${s.youthList.length?s.youthList.map(p=>{const q=trainingQuote(s,'youth',p.id);return `<article class="sports-card">${this.athleteHeader(p)}${tcButton(`Treinar · ${q.coins} moedas + 1 kit`,'trainYouth',p.id,locked||!q.ok)}${tcButton('Promover ao profissional','promote',p.id,s.roster.length>=30||s.map.training?.ids.includes(p.id))}${tcButton(`Vender · +${athleteSellQuote(p)} moedas`,'sellYouth',p.id,s.map.training?.ids.includes(p.id))}</article>`;}).join(''):'<p>Seu próximo ídolo pode começar aqui. Construa a base e organize uma peneira.</p>'}</div>`;
  }
  leagueHTML(s){
    const m=s.tycoon.stadium.match,venue=tycoonVenue(s),view={...s,official:m||s.official,fields:[{...s.fields[0],remaining:venue?0:s.fields[0].remaining},s.fields[1]]};
    const title=m?`${m.venue==='away'?'FORA DE CASA':'NO SEU ESTÁDIO'} · ${s.club.sigla} ${m.score[0]} × ${m.score[1]} ${m.opponent}`:venue?'ESTÁDIO INDEPENDENTE · A ARENA CONTINUA FUNCIONANDO':'OFICIAIS NO CAMPO 1 · CONSTRUA SEU ESTÁDIO';
    return `<section class="tycoon-match-strip"><b>${escapeText(title)}</b><p>${m?.phase==='admission'?`Torcida entrando: ${m.admitted} ingressos pagos.`:venue?'O placar oficial não substitui o placar das partidas locais.':'Até a construção do estádio, espere o Campo 1 ficar livre.'}</p>${m?.venue==='stadium'?`<span>${m.admitted}/${stadiumSeats(s)} torcedores · ${m.ticketRevenue} moedas em ingressos</span>`:''}</section>`+super.leagueHTML(view);
  }
  canteenHTML(s){
    const c=s.tycoon.canteen,q=restaurantSupplyQuote(s),phase=facilityStage(s.facilities.canteen).phase;
    return `<h3>Operação do balcão</h3><p data-tycoon-food-live>${c.stock}/${restaurantCapacity(s)} lanches · ${c.guests.length} clientes</p><p>Cada atendimento gera ${restaurantPrice(s)} moedas no caixa. Sem estoque ou atendimento, não há venda.</p>${tcButton(c.shipment?'Entrega de caixas a caminho':`Comprar ${q.amount} lanches · ${q.cost} moedas`,'tycoon:food','',!q.ok)}${!c.cook?tcButton('Contratar atendente · 180 moedas','tycoon:cook','',phase<2||s.wallet<180):'<p>✓ Atendente trabalhando no balcão.</p>'}${phase>=3?tcButton(`Reposição automática: ${c.autoRestock?'LIGADA':'DESLIGADA'}`,'tycoon:autoFood','',!c.cook):'<small>Fase 2: atendente. Fase 3: reposição automática paga.</small>'}<button class="action-button" data-world-action="walkBuilding" data-world-id="canteen">Levar gerente ao balcão</button>`;
  }
  partnersHTML(s){
    const p=partnerProgress(s),t=s.tycoon;
    return `<section class="tycoon-partners"><h3>Contratos fictícios do clube</h3><p>São objetivos da carreira. Não são anúncios, SDKs ou pagamentos reais.</p>${p?`<article class="sports-card"><h3>${p.name}</h3><p>${p.text}</p><strong id="tycoon-contract-progress">${p.value}/${p.target}</strong>${tcButton(`Receber ${p.reward} moedas`,'tycoon:claimPartner','',!p.complete)}</article>`:`<div class="sports-grid">${CLUB_CONTRACTS.map(d=>`<article class="sports-card"><h3>${d.name}</h3><p>${d.text}</p><b>Prêmio: ${d.reward} moedas</b>${tcButton(t.completedContracts.includes(`${s.career.seasonsPlayed}:${d.id}`)?'Concluído nesta temporada':'Aceitar contrato','tycoon:partner',d.id,!s.facilities.marketing||facilityStage(s.facilities.marketing).phase<d.phase||t.completedContracts.includes(`${s.career.seasonsPlayed}:${d.id}`))}</article>`).join('')}</div>`}</section>`;
  }
  lifeHTML(s){const g=clubObjective(s),c=s.tycoon.counters;return `<section class="tycoon-next"><small>PRÓXIMA CONQUISTA</small><h3>${g.title}</h3><p>${g.text}</p><progress max="${g.target}" value="${g.value}"></progress><p>${g.value}/${g.target}</p>${tcButton(g.complete?`Receber ${g.reward} moedas`:'Ir ao objetivo',g.complete?'tycoon:claim':'tycoon:goObjective')}</section><div class="tycoon-metrics"><span><b>${c.served}</b> lanches servidos</span><span><b>${c.trained}</b> atletas evoluídos</span><span><b>${c.stadiumGames}</b> jogos no novo ciclo</span><span><b>${c.promoted}</b> jovens promovidos</span></div><h3>Lanchonete · negócio dentro do mapa</h3>${s.facilities.canteen?this.canteenHTML(s):'<p>Selecione a lanchonete no mapa e conclua a obra para abrir o balcão.</p><button class="action-button" data-look="canteen">CONSTRUIR LANCHONETE ↗</button>'}${this.partnersHTML(s)}<h3>A história do clube</h3>${s.tycoon.recentEvents.length?s.tycoon.recentEvents.map(e=>`<p class="tycoon-journal">${escapeText(e.text)}</p>`).join(''):'<p>As próximas conquistas serão registradas aqui.</p>'}${tcButton('Gerar cartão do meu clube ↗','tycoon:share')}`;}
  async exportClubCard(id=''){
    try{
      const s=this.state,p=s.roster.find(p=>p.id===id),bio=p?s.tycoon.people[p.id]:null;
      const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const c=canvas.getContext('2d');
      c.fillStyle='#123e32';c.fillRect(0,0,1080,1350);
      const game=document.getElementById('game');c.drawImage(game,0,0,game.width,game.height,0,180,1080,690);
      const grad=c.createLinearGradient(0,630,0,980);grad.addColorStop(0,'#123e3200');grad.addColorStop(1,'#123e32');c.fillStyle=grad;c.fillRect(0,630,1080,350);
      c.fillStyle='#ffedac';c.font='800 26px system-ui';c.fillText('ARENA DE BAIRRO · MINHA HISTÓRIA',60,75);
      c.fillStyle='#fffbe9';c.font='900 48px system-ui';c.fillText(s.club.name.slice(0,30),60,138,960);
      c.font='900 50px system-ui';c.fillText(p?p.name:'Do campinho ao estádio',60,965,950);
      c.fillStyle='#d4e8bd';c.font='600 30px system-ui';
      const lines=p?[`${bio?.origin==='base'?'Formado na minha base':'Atleta do meu clube'} · ${p.pos}`,`Força ${bio?.startRating||p.overall} → ${p.overall} · potencial ${p.potential}`,`${bio?.played||0} jogos oficiais · ${bio?.goals||0} gols`]:[`${s.career.seasonsPlayed} temporadas · ${s.career.trophies} títulos`,`${s.tycoon.counters.promoted} jovens promovidos`,`${s.tycoon.counters.served} clientes atendidos na lanchonete`];
      lines.forEach((line,i)=>c.fillText(line,60,1035+i*53,950));
      c.fillStyle='#b2ccb8';c.font='500 21px system-ui';c.fillText('Conquistas reais desta partida · sem ranking online',60,1280,950);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Falha ao gerar imagem.');
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=p?'arena-meu-atleta.png':'arena-meu-clube.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);this.toast('Cartão gerado no seu dispositivo. Compartilhe onde preferir.',6);
    }catch(error){this.toast(`Não foi possível gerar o cartão: ${error.message}`,7);}
  }
}
