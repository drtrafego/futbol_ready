import { CFG } from './config.js';
import { validateState, SaveStore } from './save.js';
import { newGame } from './simulation.js';
import { cleanSeason } from './state-extensions.js';
import { emptyTycoon, ensureTycoon, CLUB_CONTRACTS } from './tycoon-model.js';
import { athleteBuyQuote, athleteSellQuote, restaurantCapacity } from './tycoon-economy.js';

function readTycoonExtension(raw,s) {
  if(raw===undefined){ensureTycoon(s);return s.tycoon;}
  const fail=label=>{throw new Error(`Save inválido: clube 0.6 / ${label}.`);};
  const obj=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(label);return v;};
  const num=(v,min,max,label,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))fail(label);return v;};
  const int=(v,max,label,min=0)=>num(v,min,max,label,true);
  const str=(v,max,label)=>{if(typeof v!=='string'||v.length>max||!v.length)fail(label);return v;};
  const list=(v,max,label)=>{if(!Array.isArray(v)||v.length>max)fail(label);return v;};
  const bool=(v,label)=>{if(typeof v!=='boolean')fail(label);return v;};
  const point=p=>{obj(p,'coordenada');return{x:num(p.x,-1100,2700,'x'),y:num(p.y,-1100,1200,'y')};};
  const actor=a=>({...point(a),walk:0,route:list(a.route,500,'rota').map(point)});
  const localPoint=p=>{obj(p,'ponto local');return{x:num(p.x,-25,25,'x local'),z:num(p.z,-25,25,'z local')};};
  obj(raw,'estrutura');if(raw.version!==1)fail('versão');const t=emptyTycoon();
  obj(raw.counters,'contadores');for(const k of Object.keys(t.counters))t.counters[k]=int(raw.counters[k],1e12,k);
  const c=obj(raw.canteen,'lanchonete');t.canteen={stock:int(c.stock,restaurantCapacity(s),'estoque'),cook:bool(c.cook,'atendente'),autoRestock:bool(c.autoRestock,'automação'),clock:0,nextGuest:int(c.nextGuest,1e12,'sequência',1),guests:[],shipment:null};
  if(t.canteen.autoRestock&&(!t.canteen.cook||s.facilities.canteen<7))fail('automação indisponível');
  t.canteen.guests=list(c.guests,6,'clientes').map(g=>{
    if(!['approach','queue'].includes(g.phase))fail('etapa do cliente');
    const fanId=int(g.fanId,1e12,'torcedor',1);if(!s.fans.some(f=>f.id===fanId&&f.phase==='going'))fail('cliente sem torcedor');
    return{...actor(g),id:int(g.id,t.canteen.nextGuest-1,'cliente',1),fanId,phase:g.phase,wait:num(g.wait,0,21,'espera'),service:num(g.service,0,10,'atendimento'),resume:list(g.resume,300,'rota retomada').map(localPoint)};
  });
  if(new Set(t.canteen.guests.map(g=>g.fanId)).size!==t.canteen.guests.length)fail('cliente duplicado');
  if(c.shipment){obj(c.shipment,'entrega');const amount=int(c.shipment.amount,12,'quantidade',1);if(t.canteen.stock+amount>restaurantCapacity(s))fail('entrega acima da capacidade');t.canteen.shipment={...actor(c.shipment),amount,cost:int(c.shipment.cost,24,'custo')};if(t.canteen.shipment.cost!==amount*2)fail('custo de entrega');}
  if((t.canteen.stock||t.canteen.shipment||t.canteen.guests.length)&&!s.facilities.canteen)fail('lanchonete ausente');
  obj(raw.people,'biografias');const allowed=new Set([...s.roster,...s.youthList].map(p=>p.id));
  if(Object.keys(raw.people).length>104)fail('quantidade de biografias');
  for(const [id,bio]of Object.entries(raw.people)){
    if(['__proto__','constructor','prototype'].includes(id)||!allowed.has(id))continue;
    obj(bio,'biografia');if(!['base','market','club'].includes(bio.origin))fail('origem');
    t.people[id]={origin:bio.origin,startRating:int(bio.startRating,99,'força inicial',1),played:int(bio.played,1e9,'jogos do atleta'),goals:int(bio.goals,1e9,'gols do atleta'),trainings:int(bio.trainings,1e9,'treinos do atleta'),events:list(bio.events,6,'eventos').map(e=>({text:str(e.text,180,'evento'),t:int(e.t,1e9,'tempo do evento')}))};
  }
  t.claimed=list(raw.claimed,1024,'conquistas').map(id=>str(id,80,'conquista'));if(new Set(t.claimed).size!==t.claimed.length)fail('conquista repetida');
  t.completedContracts=list(raw.completedContracts,60,'contratos').map(id=>str(id,80,'contrato'));if(new Set(t.completedContracts).size!==t.completedContracts.length)fail('contrato repetido');
  if(raw.partner){const p=obj(raw.partner,'parceiro');if(!CLUB_CONTRACTS.some(d=>d.id===p.id))fail('parceiro');const token=str(p.token,80,'token de contrato');if(t.completedContracts.includes(token))fail('contrato já recebido');t.partner={id:p.id,token,start:int(p.start,1e12,'início de contrato')};}
  t.recordSequence=int(raw.recordSequence,1e12,'sequência de eventos',1);
  t.recentEvents=list(raw.recentEvents,16,'eventos do clube').map(e=>({id:int(e.id,t.recordSequence-1,'evento',1),text:str(e.text,250,'texto'),kind:str(e.kind,24,'tipo'),t:int(e.t,1e9,'tempo')}));
  const cleanScorer=p=>{if(p===null)return null;obj(p,'artilheiro');const id=str(p.id,120,'id artilheiro');if(!allowed.has(id))fail('artilheiro fora do elenco');return{id,name:str(p.name,80,'nome'),counted:bool(p.counted,'gol contado')};};
  t.arenaScorers=list(raw.arenaScorers||[],200,'gols da arena').map(cleanScorer);
  t.arenaLineup=list(raw.arenaLineup||[],11,'titulares da arena').map(id=>str(id,120,'titular'));
  if(!s.official){t.arenaScorers=[];t.arenaLineup=[];}
  const stadium=obj(raw.stadium,'estádio');
  if(stadium.last){const m=obj(stadium.last,'último jogo');t.stadium.last={venue:m.venue==='away'?'away':'stadium',phase:'finished',opponent:str(m.opponent,80,'rival'),score:list(m.score,2,'placar').map(v=>int(v,100,'gol')),elapsed:CFG.match.duration,duration:CFG.match.duration,lastGoal:num(m.lastGoal,-100,s.t,'último gol'),lastGoalOurs:bool(m.lastGoalOurs,'lado do gol'),admitted:int(m.admitted,40,'público'),ticketRevenue:int(m.ticketRevenue,2000,'bilheteria')};if(t.stadium.last.score.length!==2)fail('placar');}
  if(stadium.match){
    const m=obj(stadium.match,'partida');if(s.official)fail('duas partidas oficiais');if(!s.facilities.stadium||!s.map.placements.stadium)fail('estádio ausente');
    if(!['stadium','away'].includes(m.venue)||!['admission','playing'].includes(m.phase))fail('local da partida');
    const next=cleanSeason(m.nextSeason),r=next.rounds[s.season.currentRound-1];
    if(s.season.finished||next.divisionIndex!==s.season.divisionIndex||!r?.played)fail('rodada independente');
    // Only the one current round may differ from the previously committed season.
    for(let i=0;i<s.season.rounds.length;i++)if(i!==s.season.currentRound-1&&JSON.stringify(s.season.rounds[i])!==JSON.stringify(next.rounds[i]))fail('rodada alterada');
    const results=r.matches.map(a=>{const h=next.clubs.find(c=>c.id===a.homeId),v=next.clubs.find(c=>c.id===a.awayId);return{...a,roundNumber:r.roundNumber,homeName:h.name,awayName:v.name,homeSigla:h.sigla,awaySigla:v.sigla,isPlayerMatch:h.isPlayer||v.isPlayer,isPlayerHome:h.isPlayer};});
    const pm=results.find(a=>a.isPlayerMatch),own=pm.homeId==='player'?pm.homeScore:pm.awayScore,against=pm.homeId==='player'?pm.awayScore:pm.homeScore;
    const timeline=list(m.timeline,200,'linha do tempo').map(g=>({at:num(g.at,0,CFG.match.duration,'instante gol'),ours:bool(g.ours,'autor gol')}));
    if(timeline.filter(g=>g.ours).length!==own||timeline.filter(g=>!g.ours).length!==against||timeline.some((g,i)=>i&&g.at<=timeline[i-1].at))fail('linha do tempo incompatível');
    const elapsed=num(m.elapsed,0,CFG.match.duration,'tempo de jogo'),cursor=int(m.cursor,timeline.length,'cursor');
    if(cursor!==timeline.filter(g=>g.at<=elapsed).length)fail('cursor dos gols');
    const scorers=list(m.scorers,200,'artilheiros').map(cleanScorer);if(scorers.length!==timeline.length)fail('artilheiros por gol');
    const lineup=list(m.lineup,11,'titulares').map(id=>str(id,120,'titular'));if(lineup.length!==11||new Set(lineup).size!==11||lineup.some(id=>!s.roster.some(p=>p.id===id)))fail('escalação da partida');
    const score=[timeline.slice(0,cursor).filter(g=>g.ours).length,timeline.slice(0,cursor).filter(g=>!g.ours).length];
    if(m.phase==='admission'&&(elapsed!==0||cursor!==0))fail('gols antes de começar');
    t.stadium.match={venue:m.venue,phase:m.phase,opponent:str(m.opponent,80,'adversário'),nextSeason:next,roundResult:{roundNumber:r.roundNumber,results,playerMatch:pm,finished:next.finished},elapsed,duration:CFG.match.duration,admissionElapsed:num(m.admissionElapsed,0,36,'tempo de entrada'),cursor,timeline,score,scorers,lineup,lastGoal:num(m.lastGoal,-100,s.t,'gol recente'),lastGoalOurs:bool(m.lastGoalOurs,'lado gol'),spawnClock:num(m.spawnClock,0,1,'entrada'),spawned:int(m.spawned,40,'visitantes'),admitted:int(m.admitted,40,'torcedores'),ticketRevenue:int(m.ticketRevenue,2000,'ingressos')};
    t.stadium.audience=list(stadium.audience||[],40,'público').map(a=>{if(!['approach','seated'].includes(a.phase))fail('estado da torcida');return{...actor(a),id:int(a.id,40,'torcedor estádio',1),phase:a.phase,seat:int(a.seat,39,'assento')};});
    if(new Set(t.stadium.audience.map(a=>a.id)).size!==t.stadium.audience.length||t.stadium.match.admitted!==t.stadium.audience.filter(a=>a.phase==='seated').length)fail('público duplicado');
  }
  if(!stadium.match){t.stadium.audience=list(stadium.audience||[],40,'torcida saindo').map(a=>{if(a.phase!=='leaving')fail('torcida sem partida');return{...actor(a),id:int(a.id,40,'torcedor estádio',1),phase:'leaving',seat:int(a.seat,39,'assento')};});}
  t.economyMigrated=true;s.tycoon=t;ensureTycoon(s);return t;
}
export function validateTycoonState(raw) {
  const s=validateState(raw);s.tycoon=readTycoonExtension(raw.tycoon,s);return s;
}
export function encodeTycoonSave(state,writer='export') {
  const clean=validateTycoonState(state),savedAt=Date.now();clean.savedAt=savedAt;
  const text=JSON.stringify({format:'arena-de-bairro',version:1,savedAt,writer,state:clean});
  if(new TextEncoder().encode(text).length>CFG.maxSaveBytes)throw new Error('Save excedeu o limite. Exporte um backup e reporte o problema.');
  return text;
}
export function decodeTycoonSave(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>CFG.maxSaveBytes)throw new Error('Save ausente ou grande demais.');
  let data;try{data=JSON.parse(text);}catch{throw new Error('Arquivo sem JSON válido.');}
  if(data?.format!=='arena-de-bairro'||data.version!==1)throw new Error('Formato de save não suportado.');
  return validateTycoonState(data.state);
}
export class TycoonSaveStore extends SaveStore {
  load(){
    try{
      this.lastRaw=this.storage.getItem(this.saveKey);if(!this.lastRaw)return{state:newGame(),message:'',status:'new'};
      try{return{state:decodeTycoonSave(this.lastRaw),message:'Clube recuperado. Economia 0.6 ativa; saldo anterior preservado.',status:'loaded'};}
      catch{const backup=this.storage.getItem(this.backupKey);if(backup)try{return{state:decodeTycoonSave(backup),message:'Backup anterior recuperado. O arquivo inválido foi preservado.',status:'recovered'};}catch{/* preserve both originals */}this.writable=false;return{state:newGame(),status:'invalid',message:'Save inválido preservado. Importe um backup ou reinicie somente este perfil.'};}
    }catch{this.writable=false;return{state:newGame(),status:'unavailable',message:'Armazenamento indisponível. Exporte seu progresso antes de sair.'};}
  }
  save(state,force=false){
    if(!this.writable&&!force)return{ok:false,reason:'Save bloqueado. Exporte o progresso.'};
    try{const current=this.storage.getItem(this.saveKey);if(!force&&current!==this.lastRaw){this.writable=false;return{ok:false,conflict:true,reason:'Outra aba alterou este perfil. Recarregue para não sobrescrever.'};}
      const text=encodeTycoonSave(state,this.writer);
      if(current)try{decodeTycoonSave(current);this.storage.setItem(this.backupKey,current);}catch{/* keep last valid backup */}
      this.storage.setItem(this.saveKey,text);this.lastRaw=text;this.writable=true;return{ok:true};
    }catch(error){return{ok:false,reason:`Não foi possível salvar: ${error.message}. Exporte um backup.`};}
  }
}
