/** Elenco do Gemini, integrado ao treino, formação e mercado. Valores virtuais. */
export const POSITIONS = Object.freeze(['GOL','DEF','MEI','ATA']);
export const FORMATIONS = Object.freeze({'4-4-2':{GOL:1,DEF:4,MEI:4,ATA:2},'4-3-3':{GOL:1,DEF:4,MEI:3,ATA:3},'3-5-2':{GOL:1,DEF:3,MEI:5,ATA:2},'5-3-2':{GOL:1,DEF:5,MEI:3,ATA:2}});
export const POSTURES = Object.freeze(['ofensiva','equilibrada','defensiva']);
const FIRST_NAMES=['Bernardo','Miguel','Lucas','Gabriel','Mateus','Felipe','Rafael','Diego','Thiago','Rodrigo','Bruno','Caio','Danilo','Vitor','Igor','Enzo','Luan'];
const LAST_NAMES=['Silva','Santos','Oliveira','Souza','Pereira','Lima','Carvalho','Ferreira','Ribeiro','Costa','Gomes','Martins','Araújo','Barbosa','Rocha'];
const rosterPick=(a,r)=>a[Math.min(a.length-1,Math.max(0,Math.floor(r()*a.length)))];
export function generateInitialRoster(baseStrength=46,rngFn=Math.random){
 const roster=[];let id=1;
 for(const pos of POSITIONS)for(let i=0;i<({GOL:2,DEF:5,MEI:5,ATA:3})[pos];i++){
  const overall=Math.max(38,Math.min(65,baseStrength+Math.floor(rngFn()*5)-2));
  roster.push({id:`jog_${id++}`,name:`${rosterPick(FIRST_NAMES,rngFn)} ${rosterPick(LAST_NAMES,rngFn)}`,pos,overall,potential:Math.min(99,overall+Math.floor(rngFn()*12)+6),age:18+Math.floor(rngFn()*10),starter:i<FORMATIONS['4-4-2'][pos],trainings:0});
 }return roster;
}
export const getStarters=r=>r.filter(p=>p.starter);
export const getReserves=r=>r.filter(p=>!p.starter);
export function calculateTeamStrength(roster,formation='4-4-2',posture='equilibrada',captainId=null,coachingLevel=0){
 const starters=getStarters(roster);if(!starters.length)return 10;
 const req=FORMATIONS[formation]||FORMATIONS['4-4-2'];
 const missing=POSITIONS.reduce((n,p)=>n+Math.max(0,req[p]-starters.filter(j=>j.pos===p).length),0);
 const captain=starters.find(j=>j.id===captainId);
 const avg=starters.reduce((a,j)=>a+j.overall,0)/11;
 return Math.max(10,Math.floor((avg+(posture==='ofensiva'?2:posture==='defensiva'?1:0)+(captain?Math.min(5,Math.floor(captain.overall*.05)):0)-missing*2)*(1+coachingLevel*.025)));
}
export function calculateTrainingCost(player,trainingLevel=0){return Math.max(15,Math.floor(40*Math.pow(1.28,Math.min(30,player.trainings||0))/(1+trainingLevel*.06)));}
export function trainPlayer(player,wallet,trainingLevel=0){
 if(!player)return{ok:false,reason:'Jogador inválido.'};
 if(player.overall>=Math.min(99,player.potential))return{ok:false,reason:'Potencial máximo atingido.'};
 const cost=calculateTrainingCost(player,trainingLevel);if(wallet<cost)return{ok:false,cost,reason:`Faltam ${cost-wallet} moedas para o treino.`};
 player.overall++;player.trainings=(player.trainings||0)+1;return{ok:true,cost,newOverall:player.overall};
}
export function generateMarket(divisionIndex=0,rngFn=Math.random,sequence=0){
 return Array.from({length:3},(_,i)=>{
  const overall=Math.min(96,Math.max(40,44+divisionIndex*8+Math.floor(rngFn()*7)-2));
  return{id:`mkt_${sequence}_${i}_${Math.floor(rngFn()*1e9)}`,name:`${rosterPick(FIRST_NAMES,rngFn)} ${rosterPick(LAST_NAMES,rngFn)}`,pos:rosterPick(POSITIONS,rngFn),overall,potential:Math.min(99,overall+Math.floor(rngFn()*10)+5),age:19+Math.floor(rngFn()*9),cost:Math.floor(260*Math.pow(1.065,overall-42)*(1+divisionIndex*.2))};
 });
}
export function hirePlayer(roster,marketPlayer,wallet){
 if(!marketPlayer||wallet<marketPlayer.cost)return{ok:false,reason:'Moedas insuficientes para contratar.'};
 if(roster.length>=30)return{ok:false,reason:'Elenco cheio: 30 jogadores. Venda um reserva.'};
 const id=`contratado_${marketPlayer.id}`;if(roster.some(j=>j.id===id))return{ok:false,reason:'Atleta já contratado.'};
 const player={...marketPlayer,id,starter:false,trainings:0};delete player.cost;roster.push(player);return{ok:true,cost:marketPlayer.cost,player};
}
export function playerSaleValue(player){return Math.floor(100+player.overall*7+player.potential*2);}
export function swapRosterPlayers(roster,idA,idB){
 const a=roster.find(p=>p.id===idA),b=roster.find(p=>p.id===idB);if(!a||!b||a===b||a.starter===b.starter)return false;
 [a.starter,b.starter]=[b.starter,a.starter];return true;
}
export function autoLineup(roster,formation='4-4-2'){
 const target=FORMATIONS[formation];if(!target)return false;
 const selected=new Set();for(const p of POSITIONS){const same=roster.filter(j=>j.pos===p).sort((a,b)=>b.overall-a.overall);same.slice(0,target[p]).forEach(j=>selected.add(j.id));}
 for(const j of [...roster].sort((a,b)=>b.overall-a.overall)){if(selected.size>=11)break;selected.add(j.id);}
 for(const j of roster)j.starter=selected.has(j.id);return true;
}
