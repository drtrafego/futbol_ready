/** Campeonato fictício: cada placar é aplicado aos dois clubes do confronto. */
export const DIVISIONS=Object.freeze([
 {index:0,name:'Série D',minStrength:40,targetStrength:45,reward:250,badge:'D'},
 {index:1,name:'Série C',minStrength:50,targetStrength:55,reward:600,badge:'C'},
 {index:2,name:'Série B',minStrength:60,targetStrength:65,reward:1500,badge:'B'},
 {index:3,name:'Série A',minStrength:70,targetStrength:75,reward:4000,badge:'A'},
 {index:4,name:'Continental',minStrength:80,targetStrength:86,reward:10000,badge:'★'},
 {index:5,name:'Mundial',minStrength:90,targetStrength:96,reward:30000,badge:'♛'}
]);
export const RIVALS=Object.freeze({0:[{id:'avv',name:'Atlético Vale Verde',sigla:'AVV'},{id:'use',name:'União Serrana',sigla:'USE'},{id:'rpi',name:'Real Pioneiro',sigla:'RPI'},{id:'ind',name:'Independente FC',sigla:'IND'},{id:'vns',name:'Vila Nova do Sul',sigla:'VNS'},{id:'opl',name:'Operário Leste',sigla:'OPL'},{id:'eno',name:'Estrela do Norte',sigla:'ENO'}]});
export function getDivision(index){return DIVISIONS[Math.max(0,Math.min(5,Math.floor(index||0)))];}
export function createSeason(divisionIndex=0,clubName='Clube da Vila',clubAcronym='VIL'){
 const div=getDivision(divisionIndex),defs=RIVALS[0];
 const make=(d,i)=>({...d,isPlayer:d.id==='player',strength:Math.floor(div.targetStrength*(.9+i*.03)),played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,goalDiff:0,points:0});
 const clubs=[make({id:'player',name:clubName,sigla:clubAcronym},0),...defs.map((d,i)=>make(d,i))];
 // Método circular: 7 rodadas por turno; todos se enfrentam em casa e fora.
 let ring=clubs.map(c=>c.id);const rounds=[];
 for(let r=0;r<7;r++){
  const matches=[];for(let i=0;i<4;i++){const a=ring[i],b=ring[7-i];matches.push({homeId:r%2===0?a:b,awayId:r%2===0?b:a,played:false,homeScore:0,awayScore:0});}
  rounds.push({roundNumber:r+1,played:false,matches});ring=[ring[0],ring[7],...ring.slice(1,7)];
 }
 for(let r=0;r<7;r++)rounds.push({roundNumber:r+8,played:false,matches:rounds[r].matches.map(m=>({...m,homeId:m.awayId,awayId:m.homeId}))});
 return{divisionIndex:div.index,currentRound:1,totalRounds:14,finished:false,clubs,rounds,history:[]};
}
export function sortTable(clubs){return[...clubs].sort((a,b)=>b.points-a.points||b.won-a.won||b.goalDiff-a.goalDiff||b.goalsFor-a.goalsFor||a.id.localeCompare(b.id));}
export function matchPerspective(match){
 const isHome=match.homeId==='player'||match.isPlayerHome===true;
 const own=isHome?match.homeScore:match.awayScore,against=isHome?match.awayScore:match.homeScore;
 return{isHome,own,against,ownName:isHome?match.homeName:match.awayName,opponent:isHome?match.awayName:match.homeName,result:own>against?'win':own===against?'draw':'loss'};
}
export function simulateRound(season,playerStrength,rngFn=Math.random){
 if(!season||season.finished)return null;const round=season.rounds[season.currentRound-1];if(!round||round.played)return null;
 const map=new Map(season.clubs.map(c=>[c.id,c])),results=[];
 for(const m of round.matches){
  const h=map.get(m.homeId),a=map.get(m.awayId);if(!h||!a)throw new Error('Confronto inválido.');
  const hs=h.isPlayer?playerStrength:h.strength,as=a.isPlayer?playerStrength:a.strength,ratio=hs/Math.max(1,hs+as);
  const roll=rngFn();let x=0,y=0;
  if(Math.abs(ratio-.5)<.18&&roll<.25){x=y=Math.floor(rngFn()*3);}
  else if(rngFn()<ratio){x=1+Math.floor(rngFn()*4);y=Math.floor(rngFn()*x);}
  else{y=1+Math.floor(rngFn()*4);x=Math.floor(rngFn()*y);}
  Object.assign(m,{homeScore:x,awayScore:y,played:true});
  h.played++;a.played++;h.goalsFor+=x;h.goalsAgainst+=y;a.goalsFor+=y;a.goalsAgainst+=x;h.goalDiff=h.goalsFor-h.goalsAgainst;a.goalDiff=a.goalsFor-a.goalsAgainst;
  if(x>y){h.won++;h.points+=3;a.lost++;}else if(y>x){a.won++;a.points+=3;h.lost++;}else{h.drawn++;a.drawn++;h.points++;a.points++;}
  results.push({...m,roundNumber:round.roundNumber,homeName:h.name,awayName:a.name,homeSigla:h.sigla,awaySigla:a.sigla,isPlayerMatch:h.isPlayer||a.isPlayer,isPlayerHome:h.isPlayer});
 }
 round.played=true;season.history.unshift(...results.filter(r=>r.isPlayerMatch));
 if(season.currentRound>=season.totalRounds)season.finished=true;else season.currentRound++;
 return{roundNumber:round.roundNumber,results,playerMatch:results.find(r=>r.isPlayerMatch),finished:season.finished};
}
export function evaluateSeasonEnd(season){
 if(!season?.finished)return null;const table=sortTable(season.clubs),playerPos=table.findIndex(c=>c.isPlayer)+1,div=getDivision(season.divisionIndex);
 let status='stay',nextDivisionIndex=div.index,reward=Math.floor(div.reward*.6);
 if(playerPos<=2&&div.index<5){status='promoted';nextDivisionIndex++;reward=div.reward;}
 else if(playerPos===1&&div.index===5){status='champion';reward=Math.floor(div.reward*1.5);}
 else if(playerPos>=table.length-1&&div.index>0){status='relegated';nextDivisionIndex--;reward=Math.floor(div.reward*.25);}
 return{playerPos,status,nextDivisionIndex,reward,champion:table[0].name,table};
}
