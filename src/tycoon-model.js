import { athleteBuyQuote, athleteSellQuote, restaurantCapacity } from './tycoon-economy.js';

export const CLUB_CONTRACTS = Object.freeze([
  {id:'community', name:'Mercadinho da Vila', text:'Atenda 18 clientes na lanchonete.', metric:'served', target:18, reward:180, phase:1},
  {id:'academy', name:'Esporte do Bairro', text:'Conclua 6 evoluções de atletas no CT.', metric:'trained', target:6, reward:220, phase:1},
  {id:'regional', name:'Parceiro Regional', text:'Vença 2 partidas oficiais.', metric:'wins', target:2, reward:320, phase:2}
]);
export const TYCOON_GOALS = Object.freeze([
  {id:'first-kit', title:'Prepare o primeiro treino', text:'Pegue um kit e leve ao Campo 1.', focus:'field0', reward:15, target:1, read:s=>s.stats.delivered},
  {id:'first-gate', title:'Receba a torcida', text:'Atenda os primeiros 2 visitantes na bilheteria.', focus:'gate', reward:20, target:2, read:s=>s.stats.admitted},
  {id:'delegate', title:'Sua primeira contratação', text:'Contrate o bilheteiro para cuidar dos ingressos.', focus:'operation', reward:30, target:1, read:s=>+s.staff.gate},
  {id:'second-pitch', title:'Do campinho ao clube', text:'Abra o segundo campo. A expansão continua ao redor da arena.', focus:'operation', reward:60, target:1, read:s=>+s.fields[1].unlocked},
  {id:'food-station', title:'Uma lanchonete de verdade', text:'Construa a lanchonete no terreno original e abasteça o balcão.', focus:'canteen', reward:60, target:1, read:s=>+(s.facilities.canteen>0)},
  {id:'first-customer', title:'Atenda no balcão', text:'Com estoque, leve o gerente à lanchonete. O pagamento só vem após o serviço.', focus:'canteen', reward:40, target:5, read:s=>s.tycoon.counters.served},
  {id:'academy-land', title:'O espaço dos futuros craques', text:'Compre o terreno da formação à direita da arena.', focus:'academy', reward:80, target:1, read:s=>+s.land.academy},
  {id:'training-ground', title:'A equipe evolui no campo', text:'Construa o CT, entregue kits e conclua um treinamento.', focus:'training', reward:70, target:1, read:s=>s.tycoon.counters.trained},
  {id:'homegrown', title:'Revele o ídolo da vila', text:'Construa a base, organize uma peneira e promova um jovem.', focus:'youth', reward:100, target:1, read:s=>s.tycoon.counters.promoted},
  {id:'official-win', title:'A primeira vitória oficial', text:'Abra a tabela e use um preparo para disputar a liga.', focus:'league', reward:100, target:1, read:s=>s.tycoon.counters.wins},
  {id:'own-stadium', title:'O seu estádio', text:'Compre o terreno ao norte e conclua a construção do estádio.', focus:'stadium', reward:120, target:1, read:s=>+(s.facilities.stadium>0)},
  {id:'new-venue', title:'O campinho não precisa parar', text:'Dispute uma partida no estádio enquanto a arena segue operando.', focus:'league', reward:140, target:1, read:s=>s.tycoon.counters.stadiumGames},
  {id:'partners', title:'Parcerias do bairro', text:'Construa Marketing, cumpra e receba seu primeiro contrato fictício.', focus:'board', reward:160, target:1, read:s=>s.tycoon.counters.contracts},
  {id:'third-phase', title:'Uma nova era do clube', text:'Leve o estádio até a fase 3: cobertura, setores e refletores.', focus:'stadium', reward:180, target:7, read:s=>s.facilities.stadium||0},
  {id:'first-season', title:'Sua primeira temporada completa', text:'Conclua a liga, confira a classificação e receba a premiação.', focus:'league', reward:200, target:1, read:s=>s.career.seasonsPlayed}
]);
export function emptyTycoon() {
  return {version:1, canteen:{stock:0, cook:false, autoRestock:false, guests:[], shipment:null, clock:0, nextGuest:1},
    counters:{served:0, missed:0, foodRevenue:0, foodCost:0, trained:0, promoted:0, wins:0, contracts:0, stadiumGames:0},
    people:Object.create(null), arenaScorers:[], arenaLineup:[], claimed:[], partner:null, completedContracts:[], stadium:{match:null,last:null,audience:[]},
    recordSequence:1, recentEvents:[], economyMigrated:false};
}
export function ensureTycoon(s) {
  if (!s.tycoon) s.tycoon = emptyTycoon();
  const t=s.tycoon;
  if (!t.economyMigrated) {
    for (const p of s.market) p.cost=athleteBuyQuote(p);
    for (const p of s.youthList) p.marketValue=athleteSellQuote(p);
    t.economyMigrated=true;
  }
  for(const p of [...s.roster,...s.youthList]) if(!t.people[p.id]) t.people[p.id]={origin:p.id.startsWith('promovido_')?'base':'club',startRating:p.overall,played:0,goals:0,trainings:0,events:[]};
  return t;
}
export function clubObjective(s) {
  ensureTycoon(s);
  const g=TYCOON_GOALS.find(g=>!s.tycoon.claimed.includes(g.id));
  if (g) return {...g,value:Math.min(g.target,g.read(s)),complete:g.read(s)>=g.target};
  const number=s.career.seasonsPlayed+1,id=`season-${number}`;
  return {id,title:`Temporada ${number}: escreva o próximo capítulo`,text:'Dispute a liga e continue a desenvolver o clube. A carreira não termina no segundo campo.',focus:'league',reward:100,target:s.season.totalRounds,value:s.season.rounds.filter(r=>r.played).length,complete:s.season.finished};
}
export function partnerProgress(s) {
  const p=s.tycoon.partner;if(!p)return null;const d=CLUB_CONTRACTS.find(d=>d.id===p.id);
  if(!d)return null;const value=Math.max(0,s.tycoon.counters[d.metric]-p.start);
  return {...d,token:p.token,value:Math.min(d.target,value),complete:value>=d.target};
}
export function rememberAthlete(s,id,text) {
  const t=ensureTycoon(s),bio=t.people[id];if(!bio)return;
  bio.events.unshift({text,t:Math.floor(s.t)});bio.events=bio.events.slice(0,6);
}
export function tycoonRecord(s,text,kind='club') {
  const t=ensureTycoon(s);t.recentEvents.unshift({id:t.recordSequence++,text,kind,t:Math.floor(s.t)});t.recentEvents=t.recentEvents.slice(0,16);
}
export function pruneAthleteRecords(s) {
  const live=new Set([...s.roster,...s.youthList].map(p=>p.id));
  for(const id of Object.keys(s.tycoon.people)) if(!live.has(id)) delete s.tycoon.people[id];
}
