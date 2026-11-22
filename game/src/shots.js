// Velvet Heist — staged screenshot scenes for ?shot=.
// One clear job: put the game into a fixed, readable moment so the
// maker's screenshots show the heist at its best. Real game state,
// rendered by the game's own code; updates freeze so the frame is stable.
import { TILE } from './config.js';
import { tileCenter } from './world.js';

function place(state, tx, ty) {
  const [x, y] = tileCenter(tx, ty);
  state.thief.x = x;
  state.thief.y = y;
  return [x, y];
}

function aimGuardAt(guard, x, y) {
  guard.angle = Math.atan2(y - guard.y, x - guard.x);
}

export function stageShot(state, shot, { loadLevel }) {
  state.frozen = true;
  if (shot === 'cover') {
    // Level 1, mid-heist: thief crossing the great hall, a guard's cone
    // sweeping toward him, a camera watching, loot and alarm visible.
    loadLevel(0);
    const [tx, ty] = place(state, 12, 10);
    state.thief.dir = Math.atan2(-1, 1);
    state.thief.sneak = true;
    const guard = state.guards[0];
    const [gx, gy] = tileCenter(19, 9);
    guard.x = gx; guard.y = gy;
    guard.suspicion = 0.55;
    guard.state = 'suspicious';
    aimGuardAt(guard, tx, ty);
    const cam = state.cameras[0];
    cam.angle = Math.PI / 2 + 0.35;
    state.alarm = 35;
    state.lootValue = 450;
    state.time = 47;
    state.hint = 'The Starling portraits hang in the great hall — stay out of the gold cones.';
    state.screen = 'play';
  } else if (shot === 'play') {
    // Level 2: cracking a wall safe while a guard patrols the vault hall.
    loadLevel(1);
    place(state, 17, 2);
    state.thief.dir = Math.PI / 2;
    state.thief.sneak = true;
    const safe = state.safes.find((s) => Math.abs(s.x - tileCenter(18, 2)[0]) < 1);
    if (safe) safe.crack = 1.8;
    const guard = state.guards[1];
    const [gx, gy] = tileCenter(9, 4);
    guard.x = gx; guard.y = gy;
    guard.angle = Math.PI / 2;
    const cam = state.cameras[0];
    cam.angle = Math.PI / 2 - 0.3;
    state.alarm = 12;
    state.lootValue = 900;
    state.time = 96;
    state.hint = 'Hold E — cracking the safe… (a pick makes it faster)';
    state.screen = 'play';
  } else if (shot === 'alarm') {
    // Level 3: spotted in the penthouse — red cone, alarm nearly full.
    loadLevel(2);
    const [tx, ty] = place(state, 16, 10);
    state.thief.dir = Math.PI;
    const guard = state.guards[0];
    const [gx, gy] = tileCenter(11, 9);
    guard.x = gx; guard.y = gy;
    guard.suspicion = 1;
    guard.state = 'chase';
    guard.chaseLeft = 6;
    aimGuardAt(guard, tx, ty);
    const cam = state.cameras[0];
    cam.angle = Math.PI / 2;
    cam.spotting = true;
    state.alarm = 82;
    state.lootValue = 1650;
    state.time = 132;
    state.hint = 'SPOTTED! Break line of sight — the alarm is climbing.';
    state.screen = 'play';
  } else if (shot === 'win') {
    // The getaway: level clear screen with the job's tally.
    loadLevel(0);
    state.lootValue = 1250;
    state.timeBonus = 180;
    state.ghostBonus = 250;
    state.screen = 'clear';
  } else {
    state.frozen = false;
  }
}
