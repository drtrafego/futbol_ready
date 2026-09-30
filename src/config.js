/** Valores de design: todas as moedas são virtuais, inteiras e sem valor financeiro. */
export const CFG = Object.freeze({
  version: 1,
  saveKey: 'arena-de-bairro.save.v1',
  backupKey: 'arena-de-bairro.backup.v1',
  maxMoney: 1_000_000_000_000,
  bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 14 },
  supply: { x: -11, z: 6, capacity: 12, initial: 6, interval: 2 },
  gate: { x: -3.1, z: 7, interval: 0.75, price: 12 },
  cash: { x: 4.6, z: 7, interval: 3 },
  office: { x: 10, z: 6.5 },
  player: { x: -6.5, z: 7, speed: 4.5, capacity: 3, radius: 0.3 },
  runner: { x: -8, z: 5, speed: 3.4, capacity: 3 },
  fan: { speed: 3, spawnInterval: 2, queueLimit: 8, totalLimit: 48 },
  match: { duration: 22, reward: 30, minFans: 2, seats: 6, stockLimit: 5 },
  interactionRadius: 1.25,
  transferInterval: 0.28,
  autosaveSeconds: 8,
  maxSaveBytes: 600_000,
  fields: [
    { id: 0, name: 'CAMPO DA VILA', x: -6, z: -6, intake: { x: -9, z: 2.5 } },
    { id: 1, name: 'NOVA ARENA', x: 6, z: -6, intake: { x: 3, z: 2.5 } },
  ],
});

export const UPGRADE_DEFS = Object.freeze([
  { id: 'gate', name: 'Bilheteiro', desc: 'Atende a fila sem você ficar na bilheteria.', base: 90, growth: 1, max: 1, icon: '🎟️' },
  { id: 'runner', name: 'Roupeiro', desc: 'Busca kits e abastece os campos por conta própria.', base: 160, growth: 1, max: 1, icon: '⚽' },
  { id: 'cashier', name: 'Tesoureiro', desc: 'Recolhe o caixa para a carteira a cada 3 segundos.', base: 220, growth: 1, max: 1, icon: '🪙' },
  { id: 'field2', name: 'Segundo campo', desc: 'Abre uma nova arena, com partidas e torcida próprias.', base: 600, growth: 1, max: 1, icon: '🏟️' },
  { id: 'speed', name: 'Passo mais rápido', desc: '+15% da velocidade inicial por nível.', base: 60, growth: 1.7, max: 4, icon: '👟' },
  { id: 'capacity', name: 'Bolsa de equipamentos', desc: '+2 kits transportados por nível.', base: 70, growth: 1.7, max: 3, icon: '🎒' },
  { id: 'ticket', name: 'Experiência do torcedor', desc: '+4 moedas em cada novo ingresso por nível.', base: 100, growth: 1.75, max: 5, icon: '⭐' },
  { id: 'stands', name: 'Ampliar arquibancadas', desc: '+2 lugares em cada campo por nível.', base: 140, growth: 1.8, max: 3, icon: '📣' },
]);

export const MISSIONS = Object.freeze([
  { title: 'O primeiro passo', text: 'Mova o gerente. Use WASD, setas ou o controle no canto.', key: 'walked', target: 2, zone: null },
  { title: 'Pegue os equipamentos', text: 'Vá ao DEPÓSITO e permaneça no círculo azul para pegar kits.', key: 'picked', target: 1, zone: 'supply' },
  { title: 'Prepare o campo', text: 'Leve os kits ao círculo PREPARAR, em frente ao campo da vila.', key: 'delivered', target: 1, zone: 'field0' },
  { title: 'Abra a bilheteria', text: 'Fique no círculo INGRESSOS para receber os torcedores.', key: 'admitted', target: 2, zone: 'gate' },
  { title: 'Recolha sua receita', text: 'Entre no círculo CAIXA para passar a receita à sua carteira.', key: 'collected', target: 12, zone: 'cash' },
  { title: 'Delegue uma tarefa', text: 'Junte 90 moedas. Abra EVOLUIR e contrate o bilheteiro.', key: 'staff', target: 1, zone: 'office' },
  { title: 'Faça a arena crescer', text: 'Abasteça, faça partidas e junte 600 moedas para o segundo campo.', key: 'field2', target: 1, zone: 'field1' },
  { title:'Compre espaço para crescer',text:'Abra CLUBE e compre o terreno da formação. Ele libera a base e o centro de treinamento.',key:'land_academy',target:1,zone:'club' },
  { title:'Forme os próximos craques',text:'Construa o campo da categoria de base no terreno adquirido.',key:'facility_youth',target:1,zone:'facilities' },
  { title:'Dispute a primeira rodada',text:'Ganhe preparo em uma partida da arena. Abra a tabela e jogue uma rodada oficial.',key:'league_games',target:1,zone:'league' },
  { title:'O clube merece um estádio',text:'Compre o terreno do estádio. Depois, construa seu campo oficial.',key:'facility_stadium',target:1,zone:'club' },
  { title:'Chegue à fase 3',text:'Evolua o estádio até a melhoria 7. Cobertura, setores e refletores surgem no cenário.',key:'facility_stadium',target:7,zone:'facilities' },
  { title:'Construa sua sede',text:'Compre o terreno da sede e erga a diretoria. Marketing e comissão crescem nesse espaço.',key:'facility_board',target:1,zone:'club' },
]);
