// Velvet Heist — loot, safes and tools.
// One clear job: what the thief can steal, crack and throw.
import { LOOT_VALUES, SAFE_CRACK_SECONDS, SAFE_CRACK_PICK_SECONDS, NOISE_SAFE_RADIUS } from './config.js';
import { tileCenter, dist } from './world.js';
import { hearNoise } from './guards.js';

export function buildLoot(level) {
  const loots = [];
  const safes = [];
  level.map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      const c = row[tx];
      const [x, y] = tileCenter(tx, ty);
      if (c === 'L') loots.push({ kind: 'painting', name: 'Starling Portrait', value: LOOT_VALUES.painting, x, y, taken: false, bob: Math.random() * 6 });
      if (c === 'G') loots.push({ kind: 'gem', name: 'Obsidian Gem', value: LOOT_VALUES.gem, x, y, taken: false, bob: Math.random() * 6 });
      if (c === '$') safes.push({ kind: 'safe', name: 'Wall Safe', value: LOOT_VALUES.safe, x, y, open: false, crack: 0 });
    }
  });
  return { loots, safes };
}

// Walk over loot to pocket it. Returns the value collected this tick.
export function collectLoot(state, thief) {
  let gained = 0;
  for (const loot of state.loots) {
    if (loot.taken) continue;
    if (dist(thief.x, thief.y, loot.x, loot.y) < 34) {
      loot.taken = true;
      gained += loot.value;
      state.floaters.push({ x: loot.x, y: loot.y - 20, text: `+$${loot.value}`, color: '#f2c14e', left: 1.2 });
      state.onPickup?.(loot);
    }
  }
  return gained;
}

// Nearest unopened safe within reach. Hold E to crack it (faster with a pick).
export function nearestSafe(state, thief) {
  let best = null, bestD = 48;
  for (const safe of state.safes) {
    if (safe.open) continue;
    const d = dist(thief.x, thief.y, safe.x, safe.y);
    if (d < bestD) { best = safe; bestD = d; }
  }
  return best;
}

export function crackSafe(state, safe, dt, holding) {
  if (!holding || !safe) {
    if (safe) safe.crack = Math.max(0, safe.crack - dt * 2);
    return null;
  }
  const need = state.thief.picks > 0 ? SAFE_CRACK_PICK_SECONDS : SAFE_CRACK_SECONDS;
  safe.crack += dt;
  state.noisePulse = (state.noisePulse ?? 0) + dt;
  if (state.noisePulse > 0.7) {
    state.noisePulse = 0;
    hearNoise(state.guards, safe.x, safe.y, NOISE_SAFE_RADIUS);
    state.onCrackTick?.();
  }
  if (safe.crack >= need) {
    safe.open = true;
    safe.crack = 0;
    if (state.thief.picks > 0) state.thief.picks -= 1;
    state.floaters.push({ x: safe.x, y: safe.y - 20, text: `+$${safe.value}`, color: '#f2c14e', left: 1.4 });
    state.onPickup?.(safe);
    return safe.value;
  }
  return null;
}

// Throw a noise coin toward (x,y): guards in range investigate the landing.
export function throwCoin(state, x, y) {
  if (state.thief.coins <= 0) return false;
  state.thief.coins -= 1;
  state.coins.push({ x, y, left: 1.1, r: 10 });
  hearNoise(state.guards, x, y, 220);
  state.onCoin?.(x, y);
  return true;
}

// Drop a smoke pellet at the thief: vision cannot see through it.
export function dropSmoke(state) {
  if (state.thief.smoke <= 0) return false;
  state.thief.smoke -= 1;
  state.smoke.push({ x: state.thief.x, y: state.thief.y, r: 95, left: 6 });
  state.onSmoke?.();
  return true;
}
