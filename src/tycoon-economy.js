/** One valuation model for academy and professionals. All amounts are virtual coins. */
export function athleteFairValue(p) {
  if (!p || !Number.isFinite(p.overall) || !Number.isFinite(p.potential)) return 0;
  const rating = Math.max(1, Math.min(99, p.overall));
  const potential = Math.max(rating, Math.min(99, p.potential));
  const youth = Math.max(0, 26 - Math.max(14, Math.min(60, p.age || 26)));
  return Math.max(30, Math.round(180 * Math.pow(1.065, rating - 40) + (potential - rating) * 4 + youth * 2));
}
export const athleteBuyQuote = p => Math.ceil(athleteFairValue(p) * 1.12);
export const athleteSellQuote = p => Math.floor(athleteFairValue(p) * 0.62);
export function academyIntakeQuote(s) {
  // Every possible immediate resale is below the advertised, fixed intake price.
  const level = s.facilities.youth || 0, division = s.season.divisionIndex || 0;
  const highest = Math.min(90, 36 + level * 2 + division * 3 + 5);
  return Math.ceil(athleteSellQuote({overall: highest, potential: Math.min(99, highest + 24), age: 15}) * 1.1) + 30;
}
export function restaurantCapacity(s) { return 12 + Math.ceil((s.facilities.canteen || 0) / 3) * 6; }
export function restaurantPrice(s) { return 8 + Math.ceil((s.facilities.canteen || 0) / 3) * 2; }
export function restaurantSupplyQuote(s) {
  const c = s.tycoon.canteen, amount = Math.min(12, restaurantCapacity(s) - c.stock);
  let reason = '';
  if (!s.facilities.canteen) reason = 'Construa a lanchonete no mapa.';
  else if (s.map.construction.some(j => j.id === 'canteen')) reason = 'A lanchonete está em obras.';
  else if (c.shipment) reason = 'Já há uma entrega a caminho.';
  else if (amount <= 0) reason = 'Estoque cheio.';
  else if (s.wallet < amount * 2) reason = `Faltam ${amount * 2 - s.wallet} moedas.`;
  return {ok: !reason, reason, amount, cost: amount * 2};
}
