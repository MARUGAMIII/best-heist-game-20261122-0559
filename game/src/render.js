// Velvet Heist — all canvas drawing: the gallery, the cones, the HUD,
// and every screen. One clear job: turn the state into a picture.
import { TILE, VIEW_W, VIEW_H, PALETTE, GUARD_RANGE, GUARD_FOV, CAMERA_RANGE, CAMERA_FOV } from './config.js';
import { tileCenter, conePolygon } from './world.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFloor(ctx, level) {
  for (let ty = 0; ty < level.map.length; ty++) {
    for (let tx = 0; tx < level.map[ty].length; tx++) {
      const c = level.map[ty][tx];
      const x = tx * TILE, y = ty * TILE;
      if (c === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + 3, y + 8, TILE - 6, 2);
        continue;
      }
      const alt = (tx + ty) % 2 === 0;
      if (c === 'C') ctx.fillStyle = alt ? PALETTE.carpet : PALETTE.carpetAlt;
      else if (c === 'S') ctx.fillStyle = PALETTE.shadow;
      else ctx.fillStyle = alt ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (c === 'C') {
        ctx.strokeStyle = 'rgba(242,193,78,0.16)';
        ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
      }
      if (c === 'S') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y, TILE, TILE);
      }
      if (c === 'D') {
        ctx.fillStyle = '#2f6b4f';
        ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = '#7fe7c4';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 4);
      }
      if (c === 'H') {
        ctx.fillStyle = '#274b73';
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.fillStyle = '#5ec8ff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('HACK', x + TILE / 2, y + TILE / 2 + 3);
      }
    }
  }
}

function drawCone(ctx, level, x, y, angle, fov, range, hot) {
  const pts = conePolygon(level, x, y, angle, fov, range);
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, hot ? 'rgba(255,77,94,0.42)' : 'rgba(242,193,78,0.34)');
  grad.addColorStop(1, hot ? 'rgba(255,77,94,0.05)' : 'rgba(242,193,78,0.04)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function drawWorld(ctx, state) {
  const { level } = state;
  drawFloor(ctx, level);

  // Loot: paintings glow gold on the floor, gems sparkle.
  for (const loot of state.loots) {
    if (loot.taken) continue;
    const bob = Math.sin(state.time * 2 + loot.bob) * 2;
    if (loot.kind === 'painting') {
      ctx.save();
      ctx.translate(loot.x, loot.y + bob);
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(-11, -7, 22, 14);
      ctx.fillStyle = '#7a4a8f';
      ctx.beginPath();
      ctx.arc(0, -1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f7d5a';
      ctx.fillRect(-8, 3, 16, 4);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(loot.x, loot.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#5ec8ff';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(-4, -4, 6, 6);
      ctx.restore();
    }
  }

  // Safes: steel boxes with a dial; cracking shows a progress ring.
  for (const safe of state.safes) {
    ctx.fillStyle = safe.open ? '#3a3f5e' : '#6b7194';
    ctx.fillRect(safe.x - 15, safe.y - 15, 30, 30);
    ctx.strokeStyle = '#c8cede';
    ctx.lineWidth = 2;
    ctx.strokeRect(safe.x - 15, safe.y - 15, 30, 30);
    ctx.beginPath();
    ctx.arc(safe.x, safe.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = safe.open ? '#7fe7c4' : '#f2c14e';
    ctx.fill();
    if (!safe.open && safe.crack > 0) {
      const need = state.thief.picks > 0 ? 1.4 : 3;
      ctx.beginPath();
      ctx.arc(safe.x, safe.y, 20, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * safe.crack) / need);
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  // Thrown coins.
  for (const coin of state.coins) {
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f2c14e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Smoke clouds.
  for (const s of state.smoke) {
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(200,205,222,0.55)');
    g.addColorStop(1, 'rgba(200,205,222,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Camera cones first (under the guards), then guard cones.
  for (const cam of state.cameras) {
    if (cam.offLeft <= 0) drawCone(ctx, level, cam.x, cam.y, cam.angle, CAMERA_FOV, CAMERA_RANGE, cam.spotting);
  }
  for (const guard of state.guards) {
    const hot = guard.state === 'chase' || guard.suspicion > 0.6;
    drawCone(ctx, level, guard.x, guard.y, guard.angle, GUARD_FOV, GUARD_RANGE, hot);
  }

  // Cameras: little wall domes.
  for (const cam of state.cameras) {
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = cam.offLeft > 0 ? '#3a3f5e' : cam.spotting ? '#ff4d5e' : '#2b3a55';
    ctx.fill();
    ctx.strokeStyle = cam.offLeft > 0 ? '#555' : '#5ec8ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (cam.offLeft <= 0) {
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.lineTo(cam.x + Math.cos(cam.angle) * 18, cam.y + Math.sin(cam.angle) * 18);
      ctx.strokeStyle = '#5ec8ff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  // Guards: orange figures with a facing tick and a suspicion arc.
  for (const guard of state.guards) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.r, 0, Math.PI * 2);
    ctx.fillStyle = guard.state === 'chase' ? '#ff4d5e' : '#ff9d5c';
    ctx.fill();
    ctx.strokeStyle = '#1c1f33';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (guard.r + 8), guard.y + Math.sin(guard.angle) * (guard.r + 8));
    ctx.strokeStyle = '#ffe9c4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1f33';
    ctx.fill();
    if (guard.suspicion > 0.05) {
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.r + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * guard.suspicion);
      ctx.strokeStyle = guard.suspicion >= 1 ? '#ff4d5e' : '#f2c14e';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff4d5e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - guard.r - 8);
    } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
      ctx.fillStyle = '#f2c14e';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - guard.r - 8);
    }
  }

  // The thief: a mint-green figure with a little mask stripe.
  const t = state.thief;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.thief;
  ctx.fill();
  ctx.strokeStyle = '#123b2e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(t.x + Math.cos(t.dir) * (t.r + 7), t.y + Math.sin(t.dir) * (t.r + 7));
  ctx.strokeStyle = '#eafff5';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#123b2e';
  ctx.fillRect(t.x - 7, t.y - 3, 14, 5);
  if (t.sneak) {
    ctx.strokeStyle = 'rgba(127,231,196,0.7)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Floating +$ popups.
  ctx.textAlign = 'center';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.left));
    ctx.fillStyle = f.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Vignette for the night mood.
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,5,14,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function drawHud(ctx, state) {
  const t = state.thief;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = '#2a2f4d';
  ctx.fillRect(0, 52, VIEW_W, 2);

  // Alarm meter — the big one, centre top.
  const ax = VIEW_W / 2 - 190, ay = 12, aw = 380, ah = 20;
  ctx.fillStyle = '#1a1d31';
  roundRect(ctx, ax, ay, aw, ah, 10);
  ctx.fill();
  const alarmFrac = state.alarm / 100;
  const alarmColor = state.alarm >= 100 ? '#ff4d5e' : state.alarm >= 60 ? '#ff9d5c' : state.alarm >= 30 ? '#f2c14e' : '#7fe7c4';
  if (alarmFrac > 0.005) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, ax + 2, ay + 2, (aw - 4) * alarmFrac, ah - 4, 8);
    ctx.fill();
  }
  ctx.strokeStyle = '#565e8f';
  ctx.lineWidth = 2;
  roundRect(ctx, ax, ay, aw, ah, 10);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.lockdown > 0 ? `LOCKDOWN ${Math.ceil(state.lockdown)}s — RUN!` : 'ALARM', VIEW_W / 2, ay + ah + 15);

  // Left: level + loot.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(state.level.name, 16, 22);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 15px sans-serif';
  const quotaOk = state.lootValue >= state.level.quota;
  ctx.fillText(`💰 $${state.lootValue} / $${state.level.quota} ${quotaOk ? '— EXIT OPEN' : ''}`, 16, 42);

  // Right: tools + timer.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = '15px sans-serif';
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillText(`${mins}:${secs}`, VIEW_W - 16, 22);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`◉ coins ${t.coins} (click)   ☁ smoke ${t.smoke} (Q)   🔓 picks ${t.picks}`, VIEW_W - 16, 42);

  // Objective line under the bar.
  if (state.hint) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(244,234,210,0.9)';
    ctx.font = '14px sans-serif';
    ctx.fillText(state.hint, VIEW_W / 2, 76);
  }

  // Hack / crack progress ring near the thief.
  if (state.panel && state.hack > 0) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 26, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * state.hack) / 2.2);
    ctx.strokeStyle = '#5ec8ff';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#5ec8ff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HACKING…', t.x, t.y - 32);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6,8,20,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || PALETTE.gold;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 240);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 32));
}

export function drawTitle(ctx, state) {
  ctx.fillStyle = '#14172e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Decorative gallery wall: framed paintings and a sweeping cone.
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 220;
    ctx.fillStyle = '#8a6d2f';
    ctx.fillRect(x, 130, 140, 100);
    ctx.fillStyle = ['#7a4a8f', '#3f7d5a', '#b3543f', '#4a6a8f', '#8f7a3f'][i];
    ctx.fillRect(x + 8, 138, 124, 84);
  }
  drawCone(ctx, state.level, 640, 700, -Math.PI / 2, 1.1, 420, false);
  ctx.beginPath();
  ctx.arc(640, 700, 16, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.thief;
  ctx.fill();
  overlay(ctx, 'VELVET HEIST', [
    'Three galleries. One crew. No alarms — if you are good.',
    '',
    'WASD / arrows — move    SHIFT — sneak    E — crack & hack',
    'Left click — throw a noise coin    Right click / Q — smoke',
    'Fill the loot quota, then reach the green EXIT.',
    '',
    'Click or press ENTER to start the job',
  ]);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '14px sans-serif';
  ctx.fillText(`Best haul so far: $${state.best || 0}`, VIEW_W / 2, 620);
}

export function drawBrief(ctx, state) {
  overlay(ctx, state.level.name, [
    state.level.sub,
    '',
    `Loot quota: $${state.level.quota} — then the EXIT opens.`,
    `Guards: ${state.guards.length}    Cameras: ${state.cameras.length}    Par: ${Math.floor(state.level.par / 60)}:${(state.level.par % 60).toString().padStart(2, '0')}`,
    '',
    'Press ENTER or click to begin',
  ], '#f2c14e');
}

export function drawCaught(ctx, state) {
  overlay(ctx, 'CAUGHT!', [
    state.caughtReason || 'A guard got his hands on you.',
    `Loot kept from this job: $${state.lootValue}`,
    '',
    'Press R to retry this gallery, or ENTER for the title screen',
  ], '#ff4d5e');
}

export function drawClear(ctx, state) {
  const bonus = state.timeBonus || 0;
  const ghost = state.ghostBonus || 0;
  overlay(ctx, 'CLEAN GETAWAY', [
    `${state.level.name} — loot $${state.lootValue}  (quota $${state.level.quota})`,
    `Time bonus: +$${bonus}    Ghost bonus: +$${ghost}`,
    `Job total: $${state.lootValue + bonus + ghost}`,
    '',
    'Press ENTER to spend your take at the fence (shop)',
  ], '#7fe7c4');
}

export function drawShop(ctx, state) {
  overlay(ctx, 'THE FENCE', [
    `Your take: $${state.money} — spend it before the next job.`,
    '',
    '1 — Noise coins ×3 ......... $25',
    '2 — Smoke pellets ×2 ....... $80',
    '3 — Lockpick ×2 ............ $60',
    '',
    'Press 1 / 2 / 3 to buy, ENTER for the next gallery',
  ], '#f2c14e');
}

export function drawWin(ctx, state) {
  overlay(ctx, 'THE STARLING JOB — DONE', [
    'All three galleries, one clean crew. The city never saw you.',
    `Total haul: $${state.money}`,
    `Final score: ${state.score}`,
    '',
    'Press ENTER to play again',
  ], '#7fe7c4');
}

export function drawOver(ctx, state) {
  overlay(ctx, 'THE CREW RETIRES', [
    'Three strikes and the galleries go quiet.',
    `Final haul: $${state.money}    Score: ${state.score}`,
    '',
    'Press ENTER to start a new crew',
  ], '#ff4d5e');
}
