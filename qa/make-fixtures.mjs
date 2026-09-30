import {writeFile} from 'node:fs/promises';
import {WorldSimulation} from '../src/world-simulation.js';
import {WORLD_STRUCTURES} from '../src/world-model.js';
import {encodeSave} from '../src/save.js';
import {newGame} from '../src/simulation.js';
const s=newGame({clubName:'Bernardo FC',sigla:'BFC'});
s.wallet=50000;s.fields[1].unlocked=true;s.facilities.pitch2=1;s.staff={gate:true,runner:true,cashier:true};
s.stats.walked=100;s.stats.picked=50;s.stats.delivered=50;s.stats.admitted=50;s.stats.collected=1000;s.stats.upgrades=8;
const sim=new WorldSimulation(s);const advance=sec=>{for(let i=0;i<sec*10;i++)sim.tick(.1);};
await writeFile('qa/fixture-expansion.json',encodeSave(s));
for(const id of['academy','stadium','business'])sim.buyLand(id);
for(const id of ['youth','training','stadium','board','marketing']){sim.upgradeFacility(id,WORLD_STRUCTURES[id]);advance(55);}
await writeFile('qa/fixture-phase1.json',encodeSave(s));
for(let l=1;l<7;l++)for(const id of['youth','training','stadium','board','marketing']){sim.upgradeFacility(id);advance(55);}
s.map.ctKits=12;
await writeFile('qa/fixture-phase3.json',encodeSave(s));
console.log('Fixtures visuais: saldo concedido exclusivamente para testes. Nada é carregado no jogo por padrão.');
