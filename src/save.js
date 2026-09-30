import { CFG } from './config.js';
import { restoreExtensions } from './state-extensions.js';
import { newGame, carryCapacity, seatCapacity } from './simulation.js';
import { walkable } from './navigation.js';

export function validateState(raw) {
  const fail = label => { throw new Error(`Save inválido: ${label}.`); };
  const obj = (v, label) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(label); return v; };
  const num = (v, label, max = CFG.maxMoney, min = 0, integer = false) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) fail(label);
    return v;
  };
  const int = (v, label, max = CFG.maxMoney, min = 0) => num(v, label, max, min, true);
  const bool = (v, label) => { if (typeof v !== 'boolean') fail(label); return v; };
  const point = (v, label) => { obj(v, label); return { x: num(v.x, label, 25, -25), z: num(v.z, label, 25, -25) }; };
  const route = (v, label) => {
    if (!Array.isArray(v) || v.length > 300) fail(label);
    return v.map(p => point(p, label));
  };
  const actor = (v, label, withCarry = true) => {
    obj(v, label);
    const a = { ...point(v, label), heading: num(v.heading, label, 20, -20), walk: num(v.walk, label, 40), route: route(v.route, label) };
    if (withCarry) { a.carry = int(v.carry, label, 12); a.actionClock = num(v.actionClock, label, 1000); }
    return a;
  };
  obj(raw, 'estrutura');
  if (raw.version !== CFG.version) throw new Error('Versão de save não suportada. O arquivo original foi preservado.');
  const s = newGame();
  s.savedAt = num(raw.savedAt, 'data', 10_000_000_000_000);
  s.t = num(raw.t, 'tempo', 1_000_000_000);
  s.wallet = int(raw.wallet, 'carteira'); s.cashDesk = int(raw.cashDesk, 'caixa');
  s.kits = int(raw.kits, 'depósito', CFG.supply.capacity);
  s.rng = int(raw.rng, 'semente', 4294967295); s.nextFanId = int(raw.nextFanId, 'sequência', 1_000_000_000, 1);
  obj(raw.staff, 'funcionários');
  for (const k of Object.keys(s.staff)) s.staff[k] = bool(raw.staff[k], k);
  obj(raw.upgrades, 'melhorias');
  const limits = { speed: 4, capacity: 3, ticket: 5, stands: 3 };
  for (const k of Object.keys(s.upgrades)) s.upgrades[k] = int(raw.upgrades[k], k, limits[k]);
  s.player = actor(raw.player, 'gerente');
  s.runner = { ...actor(raw.runner, 'roupeiro'), task: raw.runner.task, targetField: int(raw.runner.targetField, 'campo do roupeiro', 1) };
  if (!['supply', 'field'].includes(s.runner.task)) fail('tarefa do roupeiro');
  if (s.player.carry > carryCapacity(s) || s.runner.carry > CFG.runner.capacity) fail('capacidade de transporte');
  if (!walkable(s.player.x, s.player.z) || !walkable(s.runner.x, s.runner.z)) fail('posição de funcionário');
  if (!Array.isArray(raw.fields) || raw.fields.length !== 2) fail('campos');
  s.fields = raw.fields.map((f, index) => {
    obj(f, 'campo');
    if (f.id !== index) fail('identificador de campo');
    if (!Array.isArray(f.score) || f.score.length !== 2) fail('placar');
    return { id: index, unlocked: bool(f.unlocked, 'desbloqueio'), stock: int(f.stock, 'estoque do campo', CFG.match.stockLimit), remaining: num(f.remaining, 'partida', CFG.match.duration), score: f.score.map(n => int(n, 'gol', 100)), goalClock: num(f.goalClock, 'relógio de gol', 30, -1), lastGoal: num(f.lastGoal, 'último gol', s.t, -100), played: int(f.played, 'partidas', 1_000_000_000) };
  });
  if (!s.fields[0].unlocked) fail('primeiro campo');
  if (!s.fields[1].unlocked && (s.fields[1].stock || s.fields[1].remaining)) fail('campo bloqueado em funcionamento');
  if (!Array.isArray(raw.fans) || raw.fans.length > CFG.fan.totalLimit) fail('torcedores');
  const ids = new Set();
  s.fans = raw.fans.map(f => {
    const a = actor(f, 'torcedor', false);
    const id = int(f.id, 'id do torcedor', s.nextFanId - 1, 1);
    if (ids.has(id)) fail('torcedor duplicado'); ids.add(id);
    if (!['queue', 'going', 'watching', 'leaving'].includes(f.phase)) fail('estado do torcedor');
    const fan = { ...a, id, phase: f.phase, fieldId: int(f.fieldId, 'campo do torcedor', 1, -1), seat: int(f.seat, 'assento', 35, -1), color: int(f.color, 'uniforme', 4) };
    if (fan.phase === 'queue' && (fan.fieldId !== -1 || fan.seat !== -1)) fail('torcedor em fila com assento');
    if (fan.phase !== 'queue' && (fan.fieldId < 0 || fan.seat < 0 || !s.fields[fan.fieldId].unlocked || fan.seat >= seatCapacity(s))) fail('assento de torcedor');
    return fan;
  });
  if (s.fans.filter(f => f.phase === 'queue').length > CFG.fan.queueLimit) fail('fila acima do limite');
  for (const field of s.fields) {
    const admitted = s.fans.filter(f => f.fieldId === field.id && ['going', 'watching'].includes(f.phase));
    if (admitted.length > seatCapacity(s) || new Set(admitted.map(f => f.seat)).size !== admitted.length) fail('assentos ocupados');
  }
  obj(raw.timers, 'relógios');
  for (const k of Object.keys(s.timers)) s.timers[k] = num(raw.timers[k], `relógio ${k}`, 1000);
  obj(raw.stats, 'estatísticas');
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats[k], k, 1_000_000_000_000_000);
  return restoreExtensions(s, raw);
}

export function encodeSave(state, writer = 'export') {
  const clean = validateState(state);
  const savedAt = Date.now(); clean.savedAt = savedAt;
  return JSON.stringify({ format: 'arena-de-bairro', version: 1, savedAt, writer, state: clean });
}
export function decodeSave(text) {
  if (typeof text !== 'string' || text.length > CFG.maxSaveBytes) throw new Error('Arquivo de save ausente ou grande demais.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('O arquivo não contém JSON válido.'); }
  if (data?.format !== 'arena-de-bairro' || data.version !== 1) throw new Error('Formato ou versão de save não suportado.');
  return validateState(data.state);
}

/** localStorage é uma conveniência local, não autenticação, nuvem ou proteção contra trapaça. */
export class SaveStore {
  constructor(storage, saveKey = CFG.saveKey, backupKey = CFG.backupKey) {
    this.saveKey=saveKey;this.backupKey=backupKey;
    this.storage = storage; this.writable = true; this.lastRaw = null;
    this.writer = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  load() {
    try {
      this.lastRaw = this.storage.getItem(this.saveKey);
      if (!this.lastRaw) return { state: newGame(), message: '', status: 'new' };
      try { return { state: decodeSave(this.lastRaw), message: 'Progresso recuperado. Sem ganhos offline nesta versão.', status: 'loaded' }; }
      catch {
        const backup = this.storage.getItem(this.backupKey);
        if (backup) {
          try { return { state: decodeSave(backup), message: 'Save principal inválido. Backup anterior recuperado.', status: 'recovered' }; }
          catch { /* Não substituir um save que não sabemos ler. */ }
        }
        this.writable = false;
        return { state: newGame(), status: 'invalid', message: 'Save inválido ou de outra versão. Ele foi preservado; autosave desativado. Importe um backup válido ou use Reiniciar.' };
      }
    } catch {
      this.writable = false;
      return { state: newGame(), status: 'unavailable', message: 'Armazenamento indisponível. Use Exportar save antes de fechar.' };
    }
  }
  save(state, force = false) {
    if (!this.writable && !force) return { ok: false, reason: 'Armazenamento indisponível. Exporte o save para guardar o progresso.' };
    try {
      const current = this.storage.getItem(this.saveKey);
      if (!force && current !== this.lastRaw) {
        this.writable = false;
        return { ok: false, conflict: true, reason: 'Outra aba alterou o progresso. Esta sessão foi pausada. Feche a outra aba e recarregue esta página.' };
      }
      const encoded = encodeSave(state, this.writer);
      if (current) {
        try { decodeSave(current); this.storage.setItem(this.backupKey, current); }
        catch { /* Backup bom nunca é substituído por dados inválidos. */ }
      }
      this.storage.setItem(this.saveKey, encoded);
      this.lastRaw = encoded; this.writable = true;
      return { ok: true };
    } catch { return { ok: false, reason: 'Não foi possível salvar. Exporte um backup antes de fechar.' }; }
  }
  reset() {
    try { this.storage.removeItem(this.saveKey); this.storage.removeItem(this.backupKey); this.lastRaw = null; this.writable = true; return true; }
    catch { return false; }
  }
}
