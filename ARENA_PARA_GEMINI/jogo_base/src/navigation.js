import { CFG } from './config.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const near = (a, b, radius = CFG.interactionRadius) => distance(a, b) <= radius;

/** Retângulos no plano do chão. Os canteiros reservados também bloqueiam passagem. */
export function obstacles() {
  return [
    ...CFG.fields.flatMap(f => [
      { minX: f.x - 4.3, maxX: f.x + 4.3, minZ: -10.3, maxZ: -1.7 },
      { minX: f.x - 4.3, maxX: f.x + 4.3, minZ: -0.5, maxZ: 1.0 },
    ]),
    { minX: -12.5, maxX: -9.7, minZ: 3.2, maxZ: 4.6 },
    { minX: -1.9, maxX: 1.6, minZ: 7.9, maxZ: 8.9 },
    { minX: 8.5, maxX: 12, minZ: 3.5, maxZ: 5 },
  ];
}

export function walkable(x, z, radius = CFG.player.radius) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  const b = CFG.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  return !obstacles().some(o => x > o.minX - radius && x < o.maxX + radius && z > o.minZ - radius && z < o.maxZ + radius);
}

export function moveActor(actor, dx, dz, dt, speed, collision = true) {
  const length = Math.hypot(dx, dz);
  if (length < 0.001) { actor.walk = 0; return; }
  const travel = Math.min(1, length) * speed * dt;
  const vx = dx / length * travel;
  const vz = dz / length * travel;
  const oldX = actor.x, oldZ = actor.z;
  if (!collision || walkable(actor.x + vx, actor.z + vz)) {
    actor.x += vx; actor.z += vz;
  } else {
    if (walkable(actor.x + vx, actor.z)) actor.x += vx;
    if (walkable(actor.x, actor.z + vz)) actor.z += vz;
  }
  actor.walk = Math.hypot(actor.x - oldX, actor.z - oldZ) / Math.max(dt, 0.001);
  actor.heading = Math.atan2(dx, dz);
}

export function followRoute(actor, dt, speed, collision = true) {
  if (!actor.route.length) { actor.walk = 0; return true; }
  let budget = speed * dt;
  while (budget > 1e-6 && actor.route.length) {
    const goal = actor.route[0];
    const d = distance(actor, goal);
    if (d < 0.03) { actor.route.shift(); continue; }
    const step = Math.min(budget, d);
    const previous = { x: actor.x, z: actor.z };
    moveActor(actor, (goal.x - actor.x) / d, (goal.z - actor.z) / d, step / speed, speed, collision);
    budget -= step;
    if (distance(actor, goal) < 0.03) actor.route.shift();
    else if (distance(actor, previous) < 1e-8) { actor.route = []; break; }
  }
  return actor.route.length === 0;
}

/** A* de grade, oito direções, sem cortar cantos. Não há navmesh nem dependência externa. */
export function findPath(start, requested) {
  const step = 0.7;
  const b = CFG.bounds;
  const width = Math.floor((b.maxX - b.minX) / step) + 1;
  const height = Math.floor((b.maxZ - b.minZ) / step) + 1;
  const pos = index => ({ x: b.minX + (index % width) * step, z: b.minZ + Math.floor(index / width) * step });
  const valid = new Uint8Array(width * height);
  let startId = -1, endId = -1, startD = Infinity, endD = Infinity;
  for (let i = 0; i < valid.length; i++) {
    const p = pos(i);
    if (!walkable(p.x, p.z, 0.36)) continue;
    valid[i] = 1;
    const ds = distance(p, start), de = distance(p, requested);
    if (ds < startD) { startD = ds; startId = i; }
    if (de < endD) { endD = de; endId = i; }
  }
  if (startId < 0 || endId < 0) return [];
  const cost = new Float64Array(valid.length).fill(Infinity);
  const parent = new Int32Array(valid.length).fill(-1);
  const closed = new Uint8Array(valid.length);
  const open = new Set([startId]);
  cost[startId] = 0;
  const target = pos(endId);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size) {
    let current = -1, best = Infinity;
    for (const id of open) {
      const score = cost[id] + distance(pos(id), target) / step;
      if (score < best) { best = score; current = id; }
    }
    if (current === endId) {
      const path = [];
      for (let id = current; id !== -1; id = parent[id]) path.push(pos(id));
      path.reverse();
      // Não descarta o primeiro ponto: a origem pode não estar alinhada à grade.
      if (walkable(requested.x, requested.z, 0.36) && distance(target, requested) < step) path.push({ ...requested });
      return path;
    }
    open.delete(current); closed[current] = 1;
    const x = current % width, z = Math.floor(current / width);
    for (const [dx, dz] of directions) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
      const next = nz * width + nx;
      if (!valid[next] || closed[next]) continue;
      if (dx && dz && (!valid[z * width + nx] || !valid[nz * width + x])) continue;
      const newCost = cost[current] + (dx && dz ? Math.SQRT2 : 1);
      if (newCost >= cost[next]) continue;
      parent[next] = current; cost[next] = newCost; open.add(next);
    }
  }
  return [];
}
