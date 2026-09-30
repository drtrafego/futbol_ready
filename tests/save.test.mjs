import { ensureWorld } from '../src/world-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CFG } from '../src/config.js';
import { Simulation, newGame } from '../src/simulation.js';
import { encodeSave, decodeSave, validateState, SaveStore } from '../src/save.js';
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};

test('exportar e importar preserva o estado de jogo',()=>{
  const sim=new Simulation();sim.state.staff={gate:true,runner:true,cashier:true};
  for(let i=0;i<6000;i++)sim.tick(1/60);
  ensureWorld(sim.state);const loaded=decodeSave(encodeSave(sim.state));loaded.savedAt=0;assert.deepEqual(loaded,sim.state);
});
test('save rejeita JSON corrompido',()=>{assert.throws(()=>decodeSave('{ quebrado'));});
test('save rejeita versão futura sem tentar convertê-la',()=>{const x=JSON.parse(encodeSave(newGame()));x.version=99;assert.throws(()=>decodeSave(JSON.stringify(x)),/versão/);});
test('save rejeita saldo negativo e número não finito',()=>{const s=newGame();s.wallet=-1;assert.throws(()=>validateState(s));s.wallet=Infinity;assert.throws(()=>validateState(s));});
test('save rejeita kits e upgrades acima dos limites',()=>{const s=newGame();s.kits=999;assert.throws(()=>validateState(s));s.kits=6;s.upgrades.capacity=99;assert.throws(()=>validateState(s));});
test('save rejeita arquivo muito grande',()=>{assert.throws(()=>decodeSave('x'.repeat(CFG.maxSaveBytes+1)));});
test('save rejeita posição dentro de obstáculo',()=>{const s=newGame();s.player.x=-6;s.player.z=-6;assert.throws(()=>validateState(s));});
test('save rejeita tipo incorreto em funcionário',()=>{const s=newGame();s.staff.gate='sim';assert.throws(()=>validateState(s));});
test('campos desconhecidos são descartados na desserialização',()=>{const s=newGame();s.admin=true;assert.equal(validateState(s).admin,undefined);});
test('autosave e backup retêm versões anteriores válidas',()=>{
  const mem=memory(),store=new SaveStore(mem);store.load();const s=newGame();s.wallet=10;assert.ok(store.save(s).ok);s.wallet=20;assert.ok(store.save(s).ok);
  assert.equal(decodeSave(mem.getItem(CFG.backupKey)).wallet,10);assert.equal(new SaveStore(mem).load().state.wallet,20);
});
test('backup é recuperado quando o save principal está corrompido',()=>{
  const mem=memory();mem.setItem(CFG.saveKey,'corrompido');const s=newGame();s.wallet=77;mem.setItem(CFG.backupKey,encodeSave(s));
  const store=new SaveStore(mem),result=store.load();assert.equal(result.status,'recovered');assert.equal(result.state.wallet,77);assert.ok(store.save(result.state).ok);
  assert.equal(decodeSave(mem.getItem(CFG.backupKey)).wallet,77);
});
test('save inválido sem backup é preservado e não recebe autosave',()=>{
  const mem=memory();mem.setItem(CFG.saveKey,'original-inválido');const store=new SaveStore(mem),result=store.load();assert.equal(result.status,'invalid');assert.equal(store.save(newGame()).ok,false);assert.equal(mem.getItem(CFG.saveKey),'original-inválido');
});
test('falha de armazenamento não impede iniciar partida nova',()=>{
  const store=new SaveStore({getItem(){throw new Error('bloqueado');}});assert.equal(store.load().status,'unavailable');assert.equal(store.save(newGame()).ok,false);
});
test('conflito entre duas sessões não sobrescreve a mais recente',()=>{
  const mem=memory(),a=new SaveStore(mem),b=new SaveStore(mem);a.load();b.load();const s=newGame();s.wallet=44;a.save(s);
  const result=b.save(newGame());assert.equal(result.conflict,true);assert.equal(decodeSave(mem.getItem(CFG.saveKey)).wallet,44);
});
test('reiniciar apaga apenas as chaves do jogo',()=>{
  const mem=memory();mem.setItem('outro-aplicativo','preservado');const store=new SaveStore(mem);store.load();store.save(newGame());assert.ok(store.reset());assert.equal(mem.getItem(CFG.saveKey),null);assert.equal(mem.getItem('outro-aplicativo'),'preservado');
});
