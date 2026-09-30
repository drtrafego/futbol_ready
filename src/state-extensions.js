import { CFG } from './config.js';
import { FACILITIES } from './facilities.js';
import { FORMATIONS, POSTURES } from './roster.js';
const badState=label=>{throw new Error(`Save inválido: ${label}.`);};
const snum=(v,min,max,label,integer=true)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))badState(label);return v;};
const stext=(v,max,label)=>{if(typeof v!=='string'||!v.length||v.length>max)badState(label);return v;};
const slist=(v,max,label)=>{if(!Array.isArray(v)||v.length>max)badState(label);return v;};
function cleanAthlete(p,kind){
 if(!p||!['GOL','DEF','MEI','ATA'].includes(p.pos))badState('posição do atleta');
 const overall=Math.min(99,snum(p.overall,1,200,'força'));
 const a={id:stext(p.id,120,'id'),name:stext(p.name,80,'nome'),pos:p.pos,overall,potential:Math.max(overall,Math.min(99,snum(p.potential,1,220,'potencial'))),age:snum(p.age,14,60,'idade'),trainings:snum(p.trainings??0,0,1000,'treinos')};
 if(kind==='roster'){if(typeof p.starter!=='boolean')badState('titular');a.starter=p.starter;}
 if(kind==='youth')a.marketValue=snum(p.marketValue??p.estimatedValue??0,0,CFG.maxMoney,'valor');
 if(kind==='market'){a.cost=snum(p.cost??p.price??50,0,CFG.maxMoney,'preço');delete a.trainings;}
 return a;
}
export function cleanSeason(raw){
 if(!raw)badState('temporada');
 const divisionIndex=snum(raw.divisionIndex,0,5,'divisão');
 const clubs=slist(raw.clubs,16,'clubes').map(c=>({id:stext(c.id,60,'clube'),name:stext(c.name,80,'nome de clube'),sigla:stext(c.sigla,8,'sigla'),isPlayer:c.id==='player',strength:snum(c.strength,1,1000,'força rival'),played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,goalDiff:0,points:0}));
 if(clubs.length!==8||clubs.filter(c=>c.isPlayer).length!==1||new Set(clubs.map(c=>c.id)).size!==clubs.length)badState('clubes duplicados');
 const map=new Map(clubs.map(c=>[c.id,c])),history=[];let sawUnplayed=false;
 const rounds=slist(raw.rounds,50,'rodadas').map((r,index)=>{
  if(typeof r.played!=='boolean')badState('rodada');if(r.played&&sawUnplayed)badState('ordem das rodadas');if(!r.played)sawUnplayed=true;
  const used=new Set();const matches=slist(r.matches,4,'partidas').map(m=>{
   if(!map.has(m.homeId)||!map.has(m.awayId)||m.homeId===m.awayId||used.has(m.homeId)||used.has(m.awayId))badState('confrontos');used.add(m.homeId);used.add(m.awayId);
   if(typeof m.played!=='boolean'||m.played!==r.played)badState('estado de confronto');
   const x=snum(m.homeScore,0,100,'placar'),y=snum(m.awayScore,0,100,'placar');
   const item={homeId:m.homeId,awayId:m.awayId,played:m.played,homeScore:x,awayScore:y};
   if(m.played){const h=map.get(m.homeId),a=map.get(m.awayId);h.played++;a.played++;h.goalsFor+=x;h.goalsAgainst+=y;a.goalsFor+=y;a.goalsAgainst+=x;h.goalDiff=h.goalsFor-h.goalsAgainst;a.goalDiff=a.goalsFor-a.goalsAgainst;if(x>y){h.won++;h.points+=3;a.lost++;}else if(y>x){a.won++;a.points+=3;h.lost++;}else{h.drawn++;a.drawn++;h.points++;a.points++;}
    if(h.isPlayer||a.isPlayer)history.unshift({...item,roundNumber:index+1,homeName:h.name,awayName:a.name,homeSigla:h.sigla,awaySigla:a.sigla,isPlayerMatch:true,isPlayerHome:h.isPlayer});
   }
   return item;
  });if(matches.length!==4)badState('quantidade de partidas');return{roundNumber:index+1,played:r.played,matches};
 });
 if(!rounds.length)badState('calendário vazio');const idx=rounds.findIndex(r=>!r.played);
 return{divisionIndex,currentRound:idx<0?rounds.length:idx+1,totalRounds:rounds.length,finished:idx<0,clubs,rounds,history};
}
export function restoreExtensions(s,raw){
 s.schemaRevision=4;s.revision=snum(raw.revision??0,0,1e15,'revisão');s.sequence=snum(raw.sequence??1,1,1e12,'sequência');s.preparation=snum(raw.preparation??Math.min(3,s.stats.matches),0,3,'preparo');
 for(const [key,kind,max]of [['roster','roster',80],['youthList','youth',24],['market','market',30]])if(raw[key]!==undefined){s[key]=slist(raw[key],max,key).map(a=>cleanAthlete(a,kind));if(new Set(s[key].map(a=>a.id)).size!==s[key].length)badState('atleta duplicado');}
 if(!s.roster.length||s.roster.filter(j=>j.starter).length!==11)badState('11 titulares');
 if(raw.facilities)for(const id of Object.keys(FACILITIES))s.facilities[id]=snum(raw.facilities[id]??(id==='pitch1'?1:id==='pitch2'&&s.fields[1].unlocked?1:0),0,15,'instalação');
 else if(s.fields[1].unlocked)s.facilities.pitch2=1;
 if(raw.land){for(const id of Object.keys(s.land)){if(typeof raw.land[id]!=='boolean')badState('terreno');s.land[id]=raw.land[id];}if(!s.land.home)badState('arena original');}
 else{if(s.facilities.youth||s.facilities.training)s.land.academy=true;if(s.facilities.stadium)s.land.academy=s.land.stadium=true;if(s.facilities.board||s.facilities.marketing||s.facilities.coaching)s.land.academy=s.land.stadium=s.land.business=true;}
 if(raw.club)s.club={name:stext(raw.club.name,80,'clube'),sigla:stext(raw.club.sigla,8,'sigla'),colorId:stext(raw.club.colorId||'azul',40,'cor'),crest:stext(raw.club.crest||'bola',40,'escudo')};
 if(raw.tactics){if(!FORMATIONS[raw.tactics.formation]||!POSTURES.includes(raw.tactics.posture))badState('tática');s.tactics={formation:raw.tactics.formation,posture:raw.tactics.posture,captainId:s.roster.some(j=>j.id===raw.tactics.captainId&&j.starter)?raw.tactics.captainId:null};}
 if(raw.season)s.season=cleanSeason(raw.season);
 if(raw.departmentTimers)for(const id of Object.keys(s.departmentTimers))s.departmentTimers[id]=snum(raw.departmentTimers[id]??0,0,3600,'timer',false);
 s.campaignUntil=snum(raw.campaignUntil??0,0,s.t+3600,'campanha',false);
 if(raw.career){for(const id of ['seasonsPlayed','trophies','totalMatches','totalWins'])s.career[id]=snum(raw.career[id]??0,0,1e9,'carreira');
  s.career.history=slist(raw.career.history??[],10,'histórico').map(h=>({number:snum(h.number,1,1e6,'temporada'),division:snum(h.division,0,5,'divisão'),playerPos:snum(h.playerPos,1,8,'posição'),status:stext(h.status,30,'resultado'),nextDivisionIndex:snum(h.nextDivisionIndex,0,5,'divisão'),reward:snum(h.reward,0,CFG.maxMoney,'prêmio'),champion:stext(h.champion,80,'campeão'),table:slist(h.table,8,'classificação').map(c=>({id:stext(c.id,60,'clube'),name:stext(c.name,80,'clube'),points:snum(c.points,0,1000,'pontos')})),results:slist(h.results??[],50,'resultados').map(m=>({homeId:stext(m.homeId,60,'clube'),awayId:stext(m.awayId,60,'clube'),roundNumber:snum(m.roundNumber,1,50,'rodada'),homeName:stext(m.homeName,80,'clube'),awayName:stext(m.awayName,80,'clube'),homeScore:snum(m.homeScore,0,100,'gol'),awayScore:snum(m.awayScore,0,100,'gol'),isPlayerHome:m.homeId==='player'}))}));
 }
 s.achievements=slist(raw.achievements??[],50,'conquistas').map(x=>stext(x,80,'conquista'));
 s.official=null;
 if(raw.official){const o=raw.official,nextSeason=cleanSeason(o.nextSeason),elapsed=snum(o.elapsed,0,CFG.match.duration,'relógio oficial',false),timeline=slist(o.timeline,200,'gols').map(g=>({at:snum(g.at,0,CFG.match.duration,'tempo gol',false),ours:g.ours===true})),cursor=snum(o.cursor,0,timeline.length,'sequência gols');
  const roundNumber=s.season.currentRound,r=nextSeason.rounds[roundNumber-1];if(!r?.played||s.season.finished||nextSeason.divisionIndex!==s.season.divisionIndex)badState('partida oficial');
  const results=r.matches.map(m=>{const h=nextSeason.clubs.find(c=>c.id===m.homeId),a=nextSeason.clubs.find(c=>c.id===m.awayId);return{...m,roundNumber,homeName:h.name,awayName:a.name,homeSigla:h.sigla,awaySigla:a.sigla,isPlayerHome:h.isPlayer,isPlayerMatch:h.isPlayer||a.isPlayer};});
  s.official={nextSeason,elapsed,duration:CFG.match.duration,timeline,cursor,roundResult:{roundNumber,results,playerMatch:results.find(m=>m.isPlayerMatch),finished:nextSeason.finished}};
 }
 for(let i=0;i<2;i++){s.fields[i].opponent=stext(raw.fields[i].opponent||'Visitantes',80,'adversário');s.fields[i].lastGoalOurs=raw.fields[i].lastGoalOurs!==false;}
 return s;
}
