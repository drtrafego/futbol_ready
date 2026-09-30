import {writeFile} from 'node:fs/promises';
import {WorldSimulation} from '../src/world-simulation.js';
import {CFG} from '../src/config.js';
import {WORLD_STRUCTURES,structureEntry} from '../src/world-model.js';
import {encodeSave} from '../src/save.js';
const sim=new WorldSimulation(),s=sim.state,log=[];const advance=sec=>{for(let i=0;i<sec*10;i++)sim.tick(.1);};
const record=(what,result)=>{log.push({what,result,gameSeconds:Math.round(s.t),wallet:s.wallet});if(result===false)throw new Error(what);};
for(let turn=0;turn<45;turn++){
 if(!s.staff.runner){sim.goTo(CFG.supply);advance(5);sim.goTo(CFG.fields[0].intake);advance(6);}
 if(!s.staff.gate){sim.goTo(CFG.gate);advance(25);}else advance(22);
 if(!s.staff.cashier){sim.goTo(CFG.cash);advance(6);}
 for(const id of ['gate','runner','cashier','field2']){const unlocked=id==='field2'?s.fields[1].unlocked:s.staff[id];if(!unlocked){const result=sim.purchase(id);if(result.ok)record('earned purchase '+id,true);else break;}}
 if(s.fields[1].unlocked&&s.wallet>=1000)break;
}
record('automation and second field funded by simulation',s.staff.gate&&s.staff.runner&&s.staff.cashier&&s.fields[1].unlocked);
record('buy academy with earned money',sim.buyLand('academy').ok);
record('build CT with earned money',sim.upgradeFacility('training',WORLD_STRUCTURES.training).ok);advance(55);
record('CT construction completed',s.facilities.training===1);
sim.goTo(CFG.supply);advance(15);record('manager picked up kits',s.player.carry>0);sim.moveToStructure('training');advance(25);record('physical kit delivery',s.map.ctKits>0);
const id=s.roster[0].id,old=s.roster[0].overall;record('fund and start individual training',sim.trainPlayer(id).ok);advance(30);record('training changed the roster',s.roster[0].overall===old+1);
await writeFile('qa/progression-report.json',JSON.stringify({method:'No initial coins or materials granted. Simulation time accelerated; not a measurement of real play time.',log},null,2));
await writeFile('qa/progression-save.json',encodeSave(s));
console.log(JSON.stringify(log,null,2));
