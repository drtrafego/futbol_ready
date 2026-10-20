import {writeFile} from 'node:fs/promises';
import {TycoonSimulation} from '../src/tycoon-simulation.js';
import {encodeTycoonSave} from '../src/tycoon-save.js';
import {clubObjective} from '../src/tycoon-model.js';
import {CFG} from '../src/config.js';
import {WORLD_STRUCTURES} from '../src/world-model.js';
const sim=new TycoonSimulation(),s=sim.state,log=[];
const record=(what,ok)=>{log.push({what,ok,seconds:Math.round(s.t),wallet:s.wallet});if(!ok)throw Error(what);};
const claim=()=>{for(let i=0;i<20;i++){const g=clubObjective(s);if(!g.complete||s.tycoon.claimed.includes(g.id))break;sim.claimObjective();}};
const advance=sec=>{for(let i=0;i<sec*10;i++)sim.tick(.1);claim();};
for(let turn=0;turn<65;turn++){
 if(!s.staff.runner){sim.goTo(CFG.supply);advance(6);sim.goTo(CFG.fields[0].intake);advance(6);}
 if(!s.staff.gate){sim.goTo(CFG.gate);advance(25);}else advance(23);
 if(!s.staff.cashier){sim.goTo(CFG.cash);advance(6);}
 for(const id of ['gate','runner','cashier','field2']){const built=id==='field2'?s.fields[1].unlocked:s.staff[id];if(!built){const r=sim.purchase(id);if(r.ok){claim();record('Compra com receita da simulação: '+id,true);}else break;}}
 if(s.fields[1].unlocked&&s.wallet>=650)break;
}
record('Operação e segundo campo conquistados',s.staff.cashier&&s.fields[1].unlocked);
record('Lanchonete paga com moedas ganhas',sim.upgradeFacility('canteen',WORLD_STRUCTURES.canteen).ok);advance(45);
record('Lanchonete construída',s.facilities.canteen===1);
record('Estoque pago e entrega iniciada',sim.requestFood().ok);
record('Gerente caminha até balcão',sim.moveToStructure('canteen'));advance(25);
for(let n=0;n<25&&s.tycoon.counters.served<5;n++){if(s.tycoon.canteen.stock<2&&!s.tycoon.canteen.shipment)sim.requestFood();advance(12);}
record('Cinco clientes reais atendidos na lanchonete',s.tycoon.counters.served>=5);
for(let n=0;n<30&&s.wallet<1100;n++)advance(20);
record('Comprar formação',sim.buyLand('academy').ok);record('Construir CT',sim.upgradeFacility('training',WORLD_STRUCTURES.training).ok);advance(55);
sim.goTo(CFG.supply);advance(15);record('Pegar kits reais',s.player.carry>0);sim.moveToStructure('training');advance(35);record('Entregar kits no CT',s.map.ctKits>0);
const id=s.roster[0].id,old=s.roster[0].overall;record('Iniciar treino pago',sim.trainPlayer(id).ok);advance(30);record('Concluir treino e histórico',s.roster[0].overall===old+1&&s.tycoon.counters.trained>=1);
await writeFile(new URL('earned-progression.json',import.meta.url),JSON.stringify({method:'0 moedas iniciais; nenhum saldo, material, instalação ou funcionário concedido. Entradas via métodos reais. Tempo acelerado da simulação, não duração humana.',log},null,2));
await writeFile(new URL('earned-save.json',import.meta.url),encodeTycoonSave(s));console.log(JSON.stringify(log,null,2));
