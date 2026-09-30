import { UI, escapeText, formatNumber } from './ui.js';
import { FACILITIES, facilityStage, getFacilityCost } from './facilities.js';
import { WORLD_PLOTS, WORLD_STRUCTURES, TRAINING_KIT_LIMIT, ensureWorld } from './world-model.js';
import { trainingQuote } from './world-simulation.js';

const worldButton=(label,command,id='',disabled=false)=>`<button type="button" data-world-action="${command}" data-world-id="${id}" ${disabled?'disabled':''}>${label}</button>`;
export class WorldUI extends UI{
 constructor(actions,renderer){
  super(actions);this.worldRenderer=renderer;this.inspectorKey='';
  document.addEventListener('click',e=>{const b=e.target.closest('[data-world-action],[data-world-focus]');if(!b||b.disabled)return;if(b.dataset.worldFocus){this.close();actions.focus(b.dataset.worldFocus);return;}actions.worldCommand(b.dataset.worldAction,b.dataset.worldId||'');});
 }
 openSports(tab='team'){
  if(['land','facilities'].includes(tab)&&this.actions.focus){this.close();this.actions.focus('all');this.toast('Escolha um terreno ou uma construção diretamente no mapa.');return;}
  super.openSports(tab);
 }
 update(s,force=false){
  ensureWorld(s);super.update(s,force);if(!this.worldRenderer)return;
  const ct=document.getElementById('ct-resource');if(ct)ct.textContent=`${s.map.ctKits} KITS NO CT`;
  const jobs=document.getElementById('world-jobs');if(jobs)jobs.textContent=s.map.construction.length?`${s.map.construction.length} OBRA${s.map.construction.length>1?'S':''} EM ANDAMENTO`:s.map.training?'EQUIPE EM TREINAMENTO':'MAPA CONTÍNUO · ARRASTE PARA EXPLORAR';
  document.getElementById('view-button').textContent=this.worldRenderer.mapCamera.follow?'CÂMERA LIVRE':'SEGUIR GERENTE';
  const stage=s.map.construction.length;document.body.classList.toggle('building-placement',!!this.worldRenderer.placement);
  document.getElementById('placement-bar').hidden=!this.worldRenderer.placement;
  const mission=document.getElementById('mission-text');if(s.fields[1].unlocked&&s.stats.upgrades>=5&&!s.land.academy){mission.textContent='A operação está pronta. Arraste o mapa para a direita e compre o terreno vizinho; depois escolha onde construir a base e o CT.';}
  this.renderInspector(s,force);
 }
 renderInspector(s,force=false){
  const r=this.worldRenderer,n=document.getElementById('world-inspector'),selection=r.selection;
  if(!selection||r.placement){n.hidden=true;this.inspectorKey='';return;}n.hidden=false;
  const id=selection.id,kind=selection.kind,job=s.map.construction.find(j=>j.id===id),level=s.facilities[id]||0;
  const key=JSON.stringify([kind,id,level,s.land,s.wallet,s.map.ctKits,s.map.courierHired,!!s.map.training,job?.to,s.map.construction.length,s.season.divisionIndex]);
  if(force||key!==this.inspectorKey){this.inspectorKey=key;let html='';
   if(kind==='plot'){
    const plot=WORLD_PLOTS.find(p=>p.id===id),owned=s.land[id];
    html=`<span class="world-eyebrow">${owned?'SEU TERRENO':'EXPANSÃO FÍSICA DO CLUBE'}</span><h2>${escapeText(plot?.name||'Terreno')}</h2>`;
    if(!owned){html+=`<p>Este lote encosta na arena. A compra abre a cerca e libera circulação e construção aqui.</p><div class="world-cost">${formatNumber(plot.cost)} <small>MOEDAS DO JOGO</small></div>${worldButton(s.fields[1].unlocked?'Comprar este terreno':'Abra o segundo campo primeiro','buyLand',id,!s.fields[1].unlocked||s.wallet<plot.cost)}`;}
    else{html+='<p>Escolha uma instalação e posicione a obra dentro deste lote.</p><div class="world-build-list">';for(const [fid,f]of Object.entries(FACILITIES)){if(f.plot!==id||s.map.placements[fid])continue;html+=worldButton(`${f.icon} ${f.name} · ${getFacilityCost(fid,0,s.facilities.board)}`,'place',fid,s.season.divisionIndex<f.minDivision);}html+='</div>';}
   }else if(kind==='building'){
    const f=FACILITIES[id],st=facilityStage(level);if(!f){n.hidden=true;return;}
    html=`<span class="world-eyebrow">${st.built?`FASE ${st.phase} · MELHORIA ${st.step}/3`:'INSTALAÇÃO A CONSTRUIR'}</span><h2>${f.name}</h2><p>${f.desc}</p>`;
    if(job)html+=`<div class="work-status"><b id="work-status-text">EM OBRAS</b><progress id="world-work-progress" max="1"></progress><small>As melhorias entram em vigor ao concluir a obra.</small></div>`;
    else if(!s.land[f.plot])html+=worldButton('Ver terreno necessário','focusPlot',f.plot);
    else if(!s.map.placements[id]&&!WORLD_STRUCTURES[id].fixed)html+=worldButton('Escolher posição no terreno','place',id,s.wallet<getFacilityCost(id,level,s.facilities.board));
    else if(!st.maxed){const next=facilityStage(level+1),cost=getFacilityCost(id,level,s.facilities.board);html+=`<p class="phase-change">${next.phase!==st.phase?`Próxima fase: ${next.phase}. A estrutura do prédio será transformada.`:`Próxima melhoria: ${next.step}/3. Acrescenta estrutura e aumenta a produção.`}</p>${worldButton(`Iniciar obra · ${formatNumber(cost)} moedas`,'upgrade',id,s.wallet<cost||s.map.construction.length>=2||s.season.divisionIndex<f.minDivision)}`;}
    else html+='<p class="phase-change">Instalação completa. Continue desenvolvendo os outros espaços e disputando as temporadas.</p>';
    if(s.map.placements[id])html+=worldButton('Levar o gerente até aqui','walkBuilding',id);
    if(['pitch1','pitch2','stands','gate'].includes(id))html+=worldButton('Funcionários e operação','operation');
    if(id==='training'){
     const q=trainingQuote(s,'team');html+=`<div class="world-stock"><b>${s.map.ctKits}/${TRAINING_KIT_LIMIT}</b> kits entregues ao CT</div>`;
     if(s.map.training)html+='<div class="work-status"><b>TREINO EM ANDAMENTO</b><progress id="world-training-progress" max="1"></progress><small id="world-training-clock"></small></div>';
     else html+=`${worldButton(`Treinar equipe · ${q.coins} moedas + ${q.kits} kits`,'trainTeam','',!q.ok)}<small class="world-reason">${escapeText(q.reason||`+1 de força por atleta elegível, após ${q.duration}s de treino.`)}</small>`;
     html+=worldButton('Levar os kits carregados ao CT','deliverCT','',!s.facilities.training);
     if(!s.map.courierHired)html+=worldButton('Auxiliar logístico · 240 moedas','courier','',!s.facilities.training||s.wallet<240);
     else html+='<small class="world-reason">Auxiliar contratado: transporta kits do depósito ao CT sem tirar material de um campo vazio.</small>';
     html+=worldButton('Gerenciar atletas e treinos','manage','team');
    }
    if(id==='youth')html+=worldButton('Gerenciar os jovens da base','manage','youth');
    if(id==='stadium')html+=worldButton('Classificação e partidas','manage','league');
    if(['board','marketing','coaching'].includes(id))html+=worldButton('Administrar departamento','manage','board');
   }
   n.querySelector('.world-inspector-body').innerHTML=html;
  }
  if(job){const progress=document.getElementById('world-work-progress');if(progress)progress.value=job.elapsed/job.duration;const t=document.getElementById('work-status-text');if(t)t.textContent=job.worker.route.length?'EQUIPE A CAMINHO':`OBRA · ${Math.max(0,Math.ceil(job.duration-job.elapsed))}s DE JOGO`;}
  if(s.map.training){const p=document.getElementById('world-training-progress');if(p)p.value=s.map.training.elapsed/s.map.training.duration;const t=document.getElementById('world-training-clock');if(t)t.textContent=`${Math.ceil(s.map.training.duration-s.map.training.elapsed)}s · ${s.map.training.ids.length} atletas treinando`;}
 }
 teamHTML(s){
  let html=super.teamHTML(s);const q=trainingQuote(s,'team');
  html=html.replace(/<button[^>]*data-action="train"[^>]*data-id="([^"]*)"[^>]*>[^<]*<\/button>/g,(whole,htmlId)=>{const p=s.roster.find(p=>escapeText(p.id)===htmlId),quote=trainingQuote(s,'player',p?.id);return `<button class="action-button" data-action="train" data-id="${htmlId}" ${quote.ok?'':'disabled'} title="${escapeText(quote.reason)}">Treinar · ${quote.coins} moedas + 1 kit</button>`;});
  return `<section class="training-resources"><b>Treino usa recursos produzidos no clube</b><p>Moedas da operação + kits fisicamente entregues ao CT. O resultado é aplicado depois do tempo de treinamento.</p><strong>CT: ${s.map.ctKits} kits</strong> ${worldButton(`Treinar titulares · ${q.coins} moedas + ${q.kits} kits`,'trainTeam','',!q.ok)}<small>${escapeText(q.reason)}</small>${worldButton('Ver e abastecer o CT','focusBuilding','training')}</section>`+html.replace(/Treinar · (\d+)/g,'Treinar · $1 moedas + 1 kit');
 }
 youthHTML(s){return '<p class="section-note">Treinar um jovem também exige 1 kit no CT, moedas e tempo. Não há treino instantâneo grátis.</p>'+super.youthHTML(s).replace(/Treinar · (\d+)/g,'Treinar · $1 moedas + 1 kit');}
 facilityHTML(s,id){const f=FACILITIES[id],st=facilityStage(s.facilities[id]);return `<article class="sports-card"><span class="tag">FASE ${st.phase} · ${st.step}/3</span><h3>${f.name}</h3><p>As obras são feitas dentro do próprio mapa.</p>${worldButton('Localizar no terreno','focusBuilding',id)}</article>`;}
}
