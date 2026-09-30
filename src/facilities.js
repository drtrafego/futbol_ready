/** Crescimento: 5 fases, 3 melhorias por fase; cenário muda especialmente na fase 3. */
export const FACILITIES=Object.freeze({
 pitch1:{id:'pitch1',name:'Campo da Vila',desc:'Melhora o gramado e o valor das partidas locais.',baseCost:100,growth:1.28,maxLevel:15,minDivision:0,plot:'home',icon:'⚽'},
 pitch2:{id:'pitch2',name:'Segundo Campo',desc:'Evolui o segundo campo depois de abri-lo.',baseCost:130,growth:1.28,maxLevel:15,minDivision:0,plot:'home',icon:'⚽'},
 stands:{id:'stands',name:'Arquibancadas',desc:'Mais lugares reais e mais ingressos por partida.',baseCost:120,growth:1.28,maxLevel:15,minDivision:0,plot:'home',icon:'📣'},
 gate:{id:'gate',name:'Bilheteria & Catracas',desc:'Diminui o tempo de atendimento da fila.',baseCost:90,growth:1.27,maxLevel:15,minDivision:0,plot:'home',icon:'🎟️'},
 stadium:{id:'stadium',name:'Estádio do Clube',desc:'Campo oficial, setores, cobertura, luzes e premiação maior.',baseCost:800,growth:1.3,maxLevel:15,minDivision:0,plot:'stadium',icon:'🏟️'},
 youth:{id:'youth',name:'Categoria de Base',desc:'Campo de formação: revelar, treinar, promover e vender jovens.',baseCost:350,growth:1.3,maxLevel:15,minDivision:0,plot:'academy',icon:'🌱'},
 training:{id:'training',name:'Centro de Treinamento',desc:'Reduz custos de treino e melhora o desenvolvimento.',baseCost:400,growth:1.3,maxLevel:15,minDivision:0,plot:'academy',icon:'⚡'},
 marketing:{id:'marketing',name:'Marketing & Patrocínios',desc:'Mais procura de torcedores e receita de patrocinadores por partida.',baseCost:300,growth:1.3,maxLevel:15,minDivision:0,plot:'business',icon:'📢'},
 coaching:{id:'coaching',name:'Comissão Técnica',desc:'Técnico e preparadores melhoram a força dos titulares.',baseCost:700,growth:1.3,maxLevel:15,minDivision:1,plot:'business',icon:'📋'},
 board:{id:'board',name:'Diretoria & Sede',desc:'Administração reduz custo de construção e captação de talentos.',baseCost:200,growth:1.3,maxLevel:15,minDivision:0,plot:'business',icon:'🏛️'},
 canteen:{id:'canteen',name:'Lanchonete',desc:'Cada torcedor atendido gera vendas adicionais.',baseCost:250,growth:1.3,maxLevel:15,minDivision:0,plot:'home',icon:'🍿'}
});
export const LAND_PLOTS=Object.freeze([
 {id:'home',name:'Arena original',cost:0,requires:null,x:0,z:0,w:1,h:1},
 {id:'academy',name:'Terreno da formação',cost:500,requires:'home',desc:'Espaço para a base e centro de treinamento.'},
 {id:'stadium',name:'Terreno do estádio',cost:1200,requires:'academy',desc:'Abre a construção do estádio e arquibancadas próprias.'},
 {id:'business',name:'Terreno da sede',cost:1800,requires:'stadium',desc:'Espaço para diretoria, marketing e comissão.'}
]);
export function facilityStage(level){const l=Math.max(0,Math.min(15,level||0));return{built:l>0,phase:l?Math.ceil(l/3):1,step:l?(l-1)%3+1:0,level:l,maxed:l===15};}
export function getFacilityCost(id,level,boardLevel=0){const f=FACILITIES[id];return f?Math.floor(f.baseCost*f.growth**level*(1-Math.min(.2,boardLevel*.012))):null;}
export function canUpgradeFacility(id,level,division,wallet,state=null){
 const f=FACILITIES[id];if(!f)return{ok:false,reason:'Instalação inexistente.'};
 if(level>=f.maxLevel)return{ok:false,reason:'Todas as cinco fases foram concluídas.'};
 if(division<f.minDivision)return{ok:false,reason:'Comissão técnica exige acesso à Série C.'};
 if(state&&f.plot!=='home'&&!state.land?.[f.plot])return{ok:false,reason:'Compre primeiro o terreno desta instalação.'};
 if(state&&id==='pitch2'&&!state.fields[1].unlocked)return{ok:false,reason:'Abra primeiro o segundo campo em Operação.'};
 const cost=getFacilityCost(id,level,state?.facilities?.board||0);if(wallet<cost)return{ok:false,cost,reason:`Faltam ${cost-wallet} moedas.`};return{ok:true,cost};
}
const YOUTH_NAMES=['Pedrinho','Juninho','Nelsinho','Paulinho','Carlinhos','Renatinho','Marcelinho','Leo','Binho'];
export function scoutYouthProspect(youthLevel=1,divisionIndex=0,rngFn=Math.random,sequence=0){
 const overall=Math.min(90,36+youthLevel*2+divisionIndex*3+Math.floor(rngFn()*6)),potential=Math.min(99,overall+10+Math.floor(rngFn()*15));
 return{id:`base_${sequence}_${Math.floor(rngFn()*1e9)}`,name:`${YOUTH_NAMES[Math.floor(rngFn()*YOUTH_NAMES.length)]} da Vila`,pos:['GOL','DEF','MEI','ATA'][Math.floor(rngFn()*4)],overall,potential,age:15+Math.floor(rngFn()*4),marketValue:Math.floor(overall*3+potential*2),trainings:0};
}
export function promoteProspect(roster,prospect){
 if(!prospect)return{ok:false,reason:'Atleta inválido.'};if(roster.length>=30)return{ok:false,reason:'Elenco cheio: venda um reserva antes de promover.'};
 const id=`promovido_${prospect.id}`;if(roster.some(p=>p.id===id))return{ok:false,reason:'Atleta já promovido.'};
 const player={...prospect,id,starter:false};delete player.marketValue;roster.push(player);return{ok:true,player};
}
