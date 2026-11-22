// Velvet Heist — security cameras: sweeping cones, hacking, alarm.
// One clear job: cameras watch, the thief can shut them down.
import { CAMERA_RANGE, CAMERA_FOV, HACK_SECONDS, CAMERA_OFF_SECONDS } from './config.js';
import { tileCenter, insideCone, dist } from './world.js';

export function makeCamera(def) {
  const [x, y] = tileCenter(def.tx, def.ty);
  return {
    x, y, r: 12,
    baseAngle: def.angle,
    angle: def.angle,
    sweep: def.sweep,
    sweepT: Math.random() * Math.PI * 2,
    offLeft: 0, // seconds remaining disabled
    spotting: false,
  };
}

export function updateCamera(level, cam, thief, state, dt) {
  if (cam.offLeft > 0) {
    cam.offLeft -= dt;
    cam.spotting = false;
    return;
  }
  // Sweep back and forth like a metronome.
  cam.sweepT += dt * 0.55;
  cam.angle = cam.baseAngle + Math.sin(cam.sweepT) * (cam.sweep / 2);
  let range = CAMERA_RANGE;
  if (thief.sneak) range *= 0.85;
  const [ttx, tty] = [Math.floor(thief.x / 40), Math.floor(thief.y / 40)];
  if (level.map[tty] && level.map[tty][ttx] === 'S') range *= 0.7;
  let hidden = false;
  for (const s of state.smoke) {
    if (dist(thief.x, thief.y, s.x, s.y) < s.r) { hidden = true; break; }
  }
  cam.spotting = !hidden && insideCone(level, cam.x, cam.y, cam.angle, CAMERA_FOV, range, thief.x, thief.y);
  if (cam.spotting) state.onCameraSpot?.(cam, dt);
}

// Hack panel: stand within 55px of an H tile and hold E.
export function nearestPanel(level, thief) {
  for (let ty = 0; ty < level.map.length; ty++) {
    for (let tx = 0; tx < level.map[ty].length; tx++) {
      if (level.map[ty][tx] !== 'H') continue;
      const [cx, cy] = tileCenter(tx, ty);
      if (dist(thief.x, thief.y, cx, cy) < 58) return { x: cx, y: cy, tx, ty };
    }
  }
  return null;
}

export function hackProgress(state, dt, holding) {
  if (!holding || !state.panel) { state.hack = 0; return false; }
  state.hack += dt;
  if (state.hack >= HACK_SECONDS) {
    state.hack = 0;
    for (const cam of state.cameras) cam.offLeft = CAMERA_OFF_SECONDS;
    return true;
  }
  return false;
}
