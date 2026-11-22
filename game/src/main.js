// Velvet Heist — the game loop and state machine.
// One clear job: own the state, step it, and hand it to the renderer.
import {
  TILE, VIEW_W, VIEW_H, WALK_SPEED, SNEAK_SPEED, ALARM_DECAY,
  ALARM_CAMERA_RATE, ALARM_LOCKDOWN, LOCKDOWN_SECONDS, PRICES,
  NOISE_WALK_RADIUS, NOISE_SNEAK_RADIUS,
} from './config.js';
import { LEVELS, validateLevels } from './levels.js';
import { tileCenter, tileOf, moveWithCollision, dist } from './world.js';
import { makeGuard, updateGuard, hearNoise } from './guards.js';
import { makeCamera, updateCamera, nearestPanel, hackProgress } from './cameras.js';
import { buildLoot, collectLoot, nearestSafe, crackSafe, throwCoin, dropSmoke } from './loot.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  drawWorld, drawHud, drawTitle, drawBrief, drawCaught, drawClear,
  drawShop, drawWin, drawOver,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();
const statusEl = document.getElementById('status');

const state = {
  screen: 'title',
  levelIndex: 0,
  level: LEVELS[0],
  thief: null,
  guards: [],
  cameras: [],
  loots: [],
  safes: [],
  alarm: 0,
  lockdown: 0,
  lootValue: 0,
  money: 0,
  score: 0,
  time: 0,
  timeBonus: 0,
  ghostBonus: 0,
  ghost: true,
  lives: 3,
  best: 0,
  floaters: [],
  coins: [],
  smoke: [],
  hack: 0,
  panel: null,
  hint: '',
  hintLeft: 0,
  caughtReason: '',
  frozen: false,
  onSpotted: null,
  onCaught: null,
  onPickup: null,
  onCoin: null,
  onSmoke: null,
  onCrackTick: null,
  onCameraSpot: null,
};

try {
  state.best = Number(localStorage.getItem('velvet-heist-best') || 0) || 0;
} catch { /* storage unavailable: best stays 0 */ }

function loadLevel(index) {
  const level = LEVELS[index];
  state.levelIndex = index;
  state.level = level;
  const { loots, safes } = buildLoot(level);
  state.loots = loots;
  state.safes = safes;
  state.guards = level.guards.map((g) => makeGuard(g, level));
  state.cameras = level.cameras.map((c) => makeCamera(c));
  let px = TILE * 1.5, py = TILE * 1.5;
  level.map.forEach((row, ty) => {
    const x = row.indexOf('P');
    if (x >= 0) { const [cx, cy] = tileCenter(x, ty); px = cx; py = cy; }
  });
  state.thief = {
    x: px, y: py, r: 14, dir: 0,
    sneak: false, coins: 3, smoke: 2, picks: 1,
  };
  // Tools carry over between levels; fresh crew starts with the base kit.
  if (state.carryTools) {
    Object.assign(state.thief, state.carryTools);
    state.carryTools = null;
  }
  state.alarm = 0;
  state.lockdown = 0;
  state.lootValue = 0;
  state.time = 0;
  state.ghost = true;
  state.floaters = [];
  state.coins = [];
  state.smoke = [];
  state.hack = 0;
  state.panel = null;
  state.hint = 'Pocket the gold, meet the quota, reach the green EXIT.';
  state.hintLeft = 6;
  state.onSpotted = (guard) => {
    state.alarm = Math.min(100, state.alarm + 30);
    state.ghost = false;
    audio.spotted();
    state.hint = 'SPOTTED! Break line of sight — the alarm is climbing.';
    state.hintLeft = 3;
  };
  state.onCaught = (guard) => {
    if (state.screen !== 'play') return;
    state.lives -= 1;
    state.caughtReason = 'A guard got his hands on you in the gallery.';
    audio.caught();
    audio.stopSiren();
    state.screen = state.lives > 0 ? 'caught' : 'over';
    if (state.lives <= 0) state.best = Math.max(state.best, state.money);
  };
  state.onPickup = (item) => { audio.pickup(); if (item.kind === 'safe') audio.safeOpen(); };
  state.onCoin = () => audio.coin();
  state.onSmoke = () => audio.smoke();
  state.onCrackTick = () => audio.tick();
  state.onCameraSpot = (cam, dt) => {
    state.alarm = Math.min(100, state.alarm + ALARM_CAMERA_RATE * dt);
    state.ghost = false;
  };
}

function startGame() {
  state.money = 0;
  state.score = 0;
  state.lives = 3;
  state.carryTools = null;
  loadLevel(0);
  state.screen = 'brief';
}

function levelClear() {
  state.timeBonus = Math.max(0, Math.round((state.level.par - state.time) * 4));
  state.ghostBonus = state.ghost ? 250 : 0;
  const total = state.lootValue + state.timeBonus + state.ghostBonus;
  state.money += total;
  state.score += total;
  state.carryTools = {
    coins: state.thief.coins, smoke: state.thief.smoke, picks: state.thief.picks,
  };
  state.best = Math.max(state.best, state.money);
  try { localStorage.setItem('velvet-heist-best', String(state.best)); } catch { /* ignore */ }
  audio.levelClear();
  audio.stopSiren();
  state.screen = 'clear';
}

function nextLevel() {
  if (state.levelIndex + 1 >= LEVELS.length) {
    state.screen = 'win';
    return;
  }
  state.screen = 'shop';
}

function update(dt) {
  if (state.screen !== 'play' || state.frozen) return;
  state.time += dt;
  const t = state.thief;

  // Movement.
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    t.sneak = input.sneak;
    const speed = t.sneak ? SNEAK_SPEED : WALK_SPEED;
    const [nx, ny] = moveWithCollision(state.level, t.x, t.y, t.r, mx * speed * dt, my * speed * dt);
    t.x = nx; t.y = ny;
    t.dir = Math.atan2(my, mx);
    // Footsteps make noise: guards hear running, barely hear sneaking.
    state.stepNoise = (state.stepNoise ?? 0) + dt;
    if (state.stepNoise > 0.5) {
      state.stepNoise = 0;
      hearNoise(state.guards, t.x, t.y, t.sneak ? NOISE_SNEAK_RADIUS : NOISE_WALK_RADIUS);
    }
  } else {
    t.sneak = input.sneak;
  }

  // Tools: click throws a coin, right-click / Q drops smoke.
  if (input.click) {
    throwCoin(state, input.click.x, input.click.y);
    input.clearClick();
  }
  if (input.rightClick || input.consume('KeyQ')) {
    dropSmoke(state);
    input.clearClick();
  }
  if (input.consume('KeyM')) {
    const muted = audio.toggleMute();
    state.hint = muted ? 'Sound off (M to turn back on).' : 'Sound on.';
    state.hintLeft = 2;
  }

  // Loot, safes, hack panels.
  const gained = collectLoot(state, t);
  if (gained > 0) state.lootValue += gained;
  const safe = nearestSafe(state, t);
  if (safe) {
    const v = crackSafe(state, safe, dt, input.interact);
    if (v) state.lootValue += v;
    state.hint = 'Hold E — cracking the safe… (a pick makes it faster)';
    state.hintLeft = 0.2;
  }
  state.panel = nearestPanel(state.level, t);
  if (state.panel) {
    const done = hackProgress(state, dt, input.interact);
    if (done) {
      audio.hack();
      state.hint = 'Cameras down for 25 seconds — move!';
      state.hintLeft = 3;
    } else {
      state.hint = 'Hold E — hack the panel to kill the cameras';
      state.hintLeft = 0.2;
    }
  }

  // Guards and cameras.
  for (const guard of state.guards) updateGuard(state.level, guard, t, state, dt);
  for (const cam of state.cameras) updateCamera(state.level, cam, t, state, dt);

  // Alarm: decays when nobody sees the thief.
  const anyoneSees = state.guards.some((g) => g.suspicion > 0.05) || state.cameras.some((c) => c.spotting);
  if (!anyoneSees) state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
  if (state.alarm >= 60) audio.startSiren(); else audio.stopSiren();
  if (state.alarm >= ALARM_LOCKDOWN && state.lockdown <= 0) {
    state.lockdown = LOCKDOWN_SECONDS;
    state.hint = 'LOCKDOWN! Every guard is coming — get to the EXIT!';
    state.hintLeft = 4;
    for (const g of state.guards) {
      g.state = 'chase';
      g.chaseLeft = LOCKDOWN_SECONDS;
      g.lastSeen = { x: t.x, y: t.y };
    }
  }
  if (state.lockdown > 0) {
    state.lockdown -= dt;
    // During lockdown the guards keep hunting the thief's last position.
    for (const g of state.guards) {
      if (g.state === 'chase') g.lastSeen = { x: t.x, y: t.y };
    }
  }

  // Exit: open once the quota is met.
  const [etx, ety] = tileOf(t.x, t.y);
  if (state.level.map[ety][etx] === 'D' && state.lootValue >= state.level.quota) {
    levelClear();
    return;
  }

  // Timers: smoke, coins, floaters, hint.
  for (const s of state.smoke) s.left -= dt;
  state.smoke = state.smoke.filter((s) => s.left > 0);
  for (const c of state.coins) c.left -= dt;
  state.coins = state.coins.filter((c) => c.left > 0);
  for (const f of state.floaters) { f.left -= dt; f.y -= 22 * dt; }
  state.floaters = state.floaters.filter((f) => f.left > 0);
  if (state.hintLeft > 0) {
    state.hintLeft -= dt;
    if (state.hintLeft <= 0) state.hint = '';
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  switch (state.screen) {
    case 'title': drawTitle(ctx, state); break;
    case 'brief': drawBrief(ctx, state); break;
    case 'play':
      drawWorld(ctx, state);
      drawHud(ctx, state);
      break;
    case 'caught': drawWorld(ctx, state); drawHud(ctx, state); drawCaught(ctx, state); break;
    case 'clear': drawClear(ctx, state); break;
    case 'shop': drawShop(ctx, state); break;
    case 'win': drawWin(ctx, state); break;
    case 'over': drawOver(ctx, state); break;
    default: drawTitle(ctx, state);
  }
  statusEl.textContent = `screen=${state.screen} level=${state.levelIndex + 1} loot=$${state.lootValue} alarm=${Math.round(state.alarm)} lives=${state.lives}`;
}

function handleMenus() {
  const enter = input.consume('Enter') || input.click;
  if (state.screen === 'title' && (enter || input.anyKey && input.consume('Enter'))) {
    audio.unlock(); audio.click(); startGame();
  } else if (state.screen === 'brief' && enter) {
    audio.unlock(); audio.click(); state.screen = 'play';
  } else if (state.screen === 'caught' && input.consume('KeyR')) {
    loadLevel(state.levelIndex); state.screen = 'brief';
  } else if (state.screen === 'caught' && enter) {
    state.screen = 'title';
  } else if (state.screen === 'clear' && enter) {
    nextLevel();
  } else if (state.screen === 'shop') {
    if (input.consume('Digit1') && state.money >= PRICES.coin) { state.money -= PRICES.coin; state.carryTools.coins += 3; audio.pickup(); }
    if (input.consume('Digit2') && state.money >= PRICES.smoke) { state.money -= PRICES.smoke; state.carryTools.smoke += 2; audio.pickup(); }
    if (input.consume('Digit3') && state.money >= PRICES.pick) { state.money -= PRICES.pick; state.carryTools.picks += 2; audio.pickup(); }
    if (enter) {
      loadLevel(state.levelIndex + 1);
      state.screen = 'brief';
    }
  } else if ((state.screen === 'win' || state.screen === 'over') && enter) {
    startGame();
  }
  if (input.click) input.clearClick();
}

// Title screen: any click also starts (menus only).
canvas.addEventListener('mousedown', () => {
  if (state.screen === 'title') { audio.unlock(); audio.click(); startGame(); }
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleMenus();
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// Boot: validate the maps, then either stage a screenshot scene or play.
const problems = validateLevels();
if (problems.length) {
  statusEl.textContent = `LEVEL ERROR: ${problems.join(' | ')}`;
  throw new Error(problems.join('\n'));
}
loadLevel(0);
state.screen = 'title';
const shot = new URLSearchParams(location.search).get('shot');
if (shot) stageShot(state, shot, { loadLevel, audio });
window.__velvet = state;
requestAnimationFrame(loop);
