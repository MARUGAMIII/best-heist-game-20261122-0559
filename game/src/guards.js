// Velvet Heist — guards: patrols, suspicion, chase, investigate.
// One clear job: decide what each guard does and how close he is to
// spotting the thief.
import {
  GUARD_SPEED, GUARD_CHASE_SPEED, GUARD_RANGE, GUARD_FOV,
  SUSPICION_FILL, SUSPICION_DRAIN, SHADOW_RANGE_FACTOR, SNEAK_RANGE_FACTOR,
} from './config.js';
import { tileCenter, tileOf, insideCone, dist, moveWithCollision } from './world.js';

export function makeGuard(def, level) {
  const [sx, sy] = tileCenter(def.path[0][0], def.path[0][1]);
  return {
    x: sx, y: sy, r: 15,
    path: def.path.map(([tx, ty]) => tileCenter(tx, ty)),
    wp: 1, pause: def.pause ?? 1.2, pauseLeft: 0,
    angle: 0, suspicion: 0, state: 'patrol', // patrol | suspicious | chase | investigate
    chaseLeft: 0, investigate: null, investigateLeft: 0,
    lastSeen: null, speed: GUARD_SPEED,
  };
}

// How well this guard can see the thief right now: 0 = invisible, 1 = clear.
export function guardVisibility(level, guard, thief, state) {
  const [ttx, tty] = tileOf(thief.x, thief.y);
  let range = GUARD_RANGE;
  if (level.map[tty][ttx] === 'S') range *= SHADOW_RANGE_FACTOR;
  if (thief.sneak) range *= SNEAK_RANGE_FACTOR;
  if (state.smoke.length > 0) {
    for (const s of state.smoke) {
      if (dist(thief.x, thief.y, s.x, s.y) < s.r) return 0; // hidden in smoke
    }
  }
  const d = dist(guard.x, guard.y, thief.x, thief.y);
  if (d > range) return 0;
  if (!insideCone(level, guard.x, guard.y, guard.angle, GUARD_FOV, range, thief.x, thief.y)) return 0;
  // Closer = clearer. 0.45 at max range, 1.0 up close.
  return 0.45 + 0.55 * (1 - d / range);
}

export function updateGuard(level, guard, thief, state, dt) {
  const vis = guardVisibility(level, guard, thief, state);
  if (vis > 0) {
    guard.suspicion = Math.min(1, guard.suspicion + SUSPICION_FILL * vis * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    if (guard.suspicion >= 1 && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.chaseLeft = 6;
      state.onSpotted?.(guard);
    } else if (guard.suspicion > 0.35 && guard.state === 'patrol') {
      guard.state = 'suspicious';
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DRAIN * dt);
    if (guard.state === 'suspicious' && guard.suspicion < 0.1) guard.state = 'patrol';
  }

  const speed = guard.state === 'chase' ? GUARD_CHASE_SPEED : GUARD_SPEED;
  if (guard.state === 'chase') {
    guard.chaseLeft -= dt;
    if (guard.lastSeen) {
      stepToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, speed, dt);
    }
    if (vis > 0) guard.chaseLeft = Math.max(guard.chaseLeft, 2);
    if (guard.chaseLeft <= 0) {
      guard.state = guard.lastSeen ? 'investigate' : 'patrol';
      guard.investigate = guard.lastSeen;
      guard.investigateLeft = 3;
    }
    if (dist(guard.x, guard.y, thief.x, thief.y) < guard.r + thief.r + 2) {
      state.onCaught?.(guard);
    }
  } else if (guard.state === 'investigate' && guard.investigate) {
    const arrived = stepToward(level, guard, guard.investigate.x, guard.investigate.y, speed, dt);
    if (arrived) {
      guard.investigateLeft -= dt;
      guard.angle += dt * 2.2; // look around
      if (guard.investigateLeft <= 0) {
        guard.state = 'patrol';
        guard.investigate = null;
      }
    }
  } else {
    // Patrol: walk the waypoints, pause and look around at each one.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.angle += dt * 0.9;
    } else {
      const [wx, wy] = guard.path[guard.wp];
      const arrived = stepToward(level, guard, wx, wy, speed, dt);
      if (arrived) {
        guard.wp = (guard.wp + 1) % guard.path.length;
        guard.pauseLeft = guard.pause;
      }
    }
  }
}

function stepToward(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x, dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  const [nx, ny] = moveWithCollision(level, guard.x, guard.y, guard.r, (dx / d) * step, (dy / d) * step);
  guard.x = nx;
  guard.y = ny;
  guard.angle = Math.atan2(dy, dx);
  return d - step < 4;
}

// A noise at (x,y) with radius r: guards in range go investigate it.
export function hearNoise(guards, x, y, radius) {
  for (const g of guards) {
    if (g.state === 'chase') continue;
    if (dist(g.x, g.y, x, y) <= radius) {
      g.state = 'investigate';
      g.investigate = { x, y };
      g.investigateLeft = 3;
      g.suspicion = Math.max(g.suspicion, 0.4);
    }
  }
}
