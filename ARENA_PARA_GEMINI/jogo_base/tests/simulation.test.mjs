import test from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../src/config.js';
import { Simulation, newGame, carryCapacity, walkingSpeed, ticketPrice, seatCapacity, upgradeCost, fieldFans, currentMission } from '../src/simulation.js';
import { distance, findPath, followRoute, walkable, moveActor } from '../src/navigation.js';
import { validateState } from '../src/save.js';

const advance=(sim,seconds,input)=>{for(let i=0;i<Math.round(seconds*60);i++)sim.tick(1/60,input);};
const go=(sim,p,seconds=12)=>{assert.ok(sim.goTo(p));advance(sim,seconds);};
const fan=(id,phase='queue',fieldId=-1,seat=-1)=>({id,x:0,z:9.75,heading:0,walk:0,phase,fieldId,seat,color:0,route:[]});

test('estado inicial: zero moedas, um campo, suprimentos gratuitos',()=>{
  const s=newGame();assert.equal(s.wallet,0);assert.equal(s.kits,6);assert.ok(s.fields[0].unlocked);assert.ok(!s.fields[1].unlocked);assert.equal(carryCapacity(s),3);validateState(s);
});
test('produção para no limite de 12 kits',()=>{const sim=new Simulation();advance(sim,90);assert.equal(sim.state.kits,12);});
test('pega até o limite da bolsa e deposita em proximidade',()=>{
  const sim=new Simulation();go(sim,CFG.supply);assert.equal(sim.state.player.carry,3);
  go(sim,CFG.fields[0].intake);assert.equal(sim.state.fields[0].stock,3);assert.equal(sim.state.player.carry,0);
});
test('não entrega no campo bloqueado',()=>{const sim=new Simulation();sim.state.player={...sim.state.player,...CFG.fields[1].intake,carry:3};advance(sim,3);assert.equal(sim.state.fields[1].stock,0);assert.equal(sim.state.player.carry,3);});
test('sem equipamentos a bilheteria não cobra ingresso',()=>{const sim=new Simulation();sim.state.staff.gate=true;advance(sim,20);assert.equal(sim.state.stats.admitted,0);assert.equal(sim.state.cashDesk,0);});
test('bilheteria paga uma única vez por torcedor e usa assentos distintos',()=>{
  const sim=new Simulation();sim.state.staff.gate=true;sim.state.fields[0].stock=5;advance(sim,13);
  assert.ok(sim.state.stats.admitted>0);assert.equal(sim.state.cashDesk,sim.state.stats.admitted*12);
  const fans=fieldFans(sim.state,0);assert.ok(fans.length<=6);assert.equal(new Set(fans.map(f=>f.seat)).size,fans.length);
});
test('partida precisa de dois torcedores sentados',()=>{
  const sim=new Simulation();sim.state.fields[0].stock=2;
  sim.state.fans=[fan(1,'watching',0,0)];sim.state.nextFanId=2;advance(sim,2);assert.equal(sim.state.fields[0].remaining,0);
  sim.state.fans.push(fan(2,'watching',0,1));sim.state.nextFanId=3;sim.tick(1/60);assert.equal(sim.state.fields[0].stock,1);assert.equal(sim.state.fields[0].remaining,22);
});
test('encerrar partida gera bônus uma vez e libera os assentos',()=>{
  const sim=new Simulation();sim.state.fields[0].remaining=.1;sim.state.fields[0].goalClock=3;
  sim.state.fans=[fan(1,'watching',0,0),fan(2,'watching',0,1)];sim.state.nextFanId=3;
  advance(sim,1);assert.equal(sim.state.cashDesk,30);assert.equal(sim.state.stats.matches,1);assert.equal(fieldFans(sim.state,0).length,0);
  advance(sim,2);assert.equal(sim.state.cashDesk,30);
});
test('coleta transfere, não duplica, o caixa',()=>{const sim=new Simulation();sim.state.cashDesk=99;assert.equal(sim.collect(),99);assert.equal(sim.collect(),0);assert.equal(sim.state.wallet,99);assert.equal(sim.state.cashDesk,0);});
test('compra sem saldo não muda o estado financeiro',()=>{const sim=new Simulation();assert.equal(sim.purchase('gate').ok,false);assert.equal(sim.state.wallet,0);assert.equal(sim.state.staff.gate,false);});
test('funcionário é comprado uma única vez e nunca debita duas vezes',()=>{const sim=new Simulation();sim.state.wallet=200;assert.equal(sim.purchase('gate').ok,true);assert.equal(sim.state.wallet,110);assert.equal(sim.purchase('gate').ok,false);assert.equal(sim.state.wallet,110);});
test('upgrade desconhecido é rejeitado',()=>{const sim=new Simulation();assert.equal(sim.purchase('__proto__').ok,false);assert.equal(sim.purchase('xyz').ok,false);});
test('melhorias seguem fórmula e limites',()=>{
  const sim=new Simulation();sim.state.wallet=100000;
  assert.equal(upgradeCost(sim.state,'capacity'),70);sim.purchase('capacity');assert.equal(carryCapacity(sim.state),5);assert.equal(upgradeCost(sim.state,'capacity'),119);
  sim.purchase('capacity');sim.purchase('capacity');assert.equal(carryCapacity(sim.state),9);assert.equal(upgradeCost(sim.state,'capacity'),null);
  sim.purchase('speed');assert.equal(walkingSpeed(sim.state),4.5*1.15);sim.purchase('ticket');assert.equal(ticketPrice(sim.state),16);sim.purchase('stands');assert.equal(seatCapacity(sim.state),8);
});
test('segundo campo desbloqueia com 600 moedas',()=>{const sim=new Simulation();sim.state.wallet=600;assert.ok(sim.purchase('field2').ok);assert.equal(sim.state.wallet,0);assert.ok(sim.state.fields[1].unlocked);});
test('A* encontra caminhos transitáveis entre todas as áreas de trabalho',()=>{
  const points=[CFG.player,CFG.supply,CFG.fields[0].intake,CFG.gate,CFG.cash,CFG.office,CFG.fields[1].intake];
  for(const a of points)for(const b of points){const route=findPath(a,b);assert.ok(route.length,JSON.stringify({a,b}));assert.ok(route.every(p=>walkable(p.x,p.z)));}
});
test('seguir rota chega ao depósito sem atravessar bloqueios',()=>{
  const actor={...newGame().player,route:findPath(CFG.player,CFG.supply)};
  for(let i=0;i<1800;i++)followRoute(actor,1/60,4.5);
  assert.ok(distance(actor,CFG.supply)<.1);assert.equal(actor.route.length,0);
});
test('colisão impede entrar no gramado',()=>{
  const actor={x:-6,z:-1,route:[],heading:0,walk:0};
  for(let i=0;i<180;i++)moveActor(actor,0,-1,1/60,4.5);
  assert.ok(actor.z>=-1.41);assert.ok(walkable(actor.x,actor.z));
});
test('entrada diagonal não aumenta velocidade',()=>{
  const a={x:5,z:10,heading:0,walk:0},b={...a};moveActor(a,1,0,.1,4);moveActor(b,1,1,.1,4);assert.ok(Math.abs(distance(a,{x:5,z:10})-distance(b,{x:5,z:10}))<1e-9);
});
test('delta enorme, negativo ou NaN não acelera economia',()=>{
  const sim=new Simulation();sim.tick(NaN);sim.tick(-20);assert.equal(sim.state.t,0);sim.tick(99999);assert.equal(sim.state.t,.1);
});
test('fila e número total de visitantes têm limites',()=>{const sim=new Simulation();advance(sim,600);assert.ok(sim.state.fans.length<=8);});
test('automação completa funciona sem o gerente executar as tarefas',()=>{
  const sim=new Simulation();sim.state.staff={gate:true,runner:true,cashier:true};advance(sim,180);
  assert.ok(sim.state.stats.matches>=3,`partidas: ${sim.state.stats.matches}`);assert.ok(sim.state.wallet>200);assert.equal(sim.state.player.carry,0);validateState(sim.state);
});
test('roupeiro abastece os dois campos e ambos realizam partidas',()=>{
  const sim=new Simulation();sim.state.staff={gate:true,runner:true,cashier:true};sim.state.fields[1].unlocked=true;advance(sim,300);
  assert.ok(sim.state.fields.every(f=>f.played>0),JSON.stringify(sim.state.fields));assert.ok(sim.state.wallet>300);validateState(sim.state);
});
test('sessão longa de 30 minutos mantém invariantes de economia e visitantes',()=>{
  const sim=new Simulation();sim.state.staff={gate:true,runner:true,cashier:true};sim.state.fields[1].unlocked=true;
  sim.state.upgrades={speed:4,capacity:3,ticket:5,stands:3};
  for(let i=0;i<30;i++){advance(sim,60);validateState(sim.state);assert.ok(sim.state.wallet>=0);assert.ok(sim.state.fans.length<=48);}
  assert.ok(sim.state.stats.matches>30);assert.ok(sim.state.wallet>3000);
});
test('missão avança por progresso real e não apenas por tempo',()=>{
  const s=newGame();assert.equal(currentMission(s).key,'walked');s.stats.walked=2;assert.equal(currentMission(s).key,'picked');
});

test('rota não é cancelada por resíduo de ponto flutuante ao chegar a um nó',()=>{
  for(let frames=1;frames<=75;frames++){
    const sim=new Simulation();
    for(let i=0;i<frames;i++)sim.tick(1/60,{x:1,z:0});
    go(sim,CFG.supply,12);
    assert.equal(sim.state.player.carry,3,`frames=${frames}, x=${sim.state.player.x}`);
    assert.ok(distance(sim.state.player,CFG.supply)<.1);
  }
});
