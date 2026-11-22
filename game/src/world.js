// Velvet Heist — the world: grid, collision, line of sight, vision rays.
// One clear job: answer "can this move / can this see that" for everyone.
import { TILE, COLS, ROWS } from './config.js';

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

export function isWall(level, tx, ty) {
  return tileAt(level, tx, ty) === '#';
}

export function isFloor(level, tx, ty) {
  return !isWall(level, tx, ty);
}

export function tileOf(px, py) {
  return [Math.floor(px / TILE), Math.floor(py / TILE)];
}

export function tileCenter(tx, ty) {
  return [(tx + 0.5) * TILE, (ty + 0.5) * TILE];
}

// Circle (px,py,r) vs wall tiles: slide along walls, return corrected pos.
export function moveWithCollision(level, x, y, r, dx, dy) {
  let nx = x + dx;
  if (collides(level, nx, y, r)) nx = x;
  let ny = y + dy;
  if (collides(level, nx, ny, r)) ny = y;
  return [nx, ny];
}

function collides(level, x, y, r) {
  const [tx, ty] = tileOf(x, y);
  for (let j = ty - 1; j <= ty + 1; j++) {
    for (let i = tx - 1; i <= tx + 1; i++) {
      if (!isWall(level, i, j)) continue;
      const cx = Math.max(i * TILE, Math.min(x, (i + 1) * TILE));
      const cy = Math.max(j * TILE, Math.min(y, (j + 1) * TILE));
      const ddx = x - cx, ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
}

// Grid raycast (DDA): distance from (x,y) along angle until a wall, max range.
export function raycast(level, x, y, angle, maxDist) {
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
  const tDeltaX = dx === 0 ? Infinity : Math.abs(TILE / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(TILE / dy);
  let tMaxX = dx === 0 ? Infinity : dx > 0
    ? ((tx + 1) * TILE - x) / dx : (x - tx * TILE) / -dx;
  let tMaxY = dy === 0 ? Infinity : dy > 0
    ? ((ty + 1) * TILE - y) / dy : (y - ty * TILE) / -dy;
  let t = 0;
  for (let i = 0; i < 200; i++) {
    if (tMaxX < tMaxY) { t = tMaxX; tMaxX += tDeltaX; tx += stepX; }
    else { t = tMaxY; tMaxY += tDeltaY; ty += stepY; }
    if (t > maxDist) return maxDist;
    if (isWall(level, tx, ty)) return t;
  }
  return maxDist;
}

// True when nothing blocks the straight line between two points.
export function hasLineOfSight(level, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  return raycast(level, x1, y1, Math.atan2(dy, dx), dist) >= dist - 1;
}

// Fan of raycasts forming a vision cone polygon (for rendering and checks).
export function conePolygon(level, x, y, angle, fov, range, rays = 26) {
  const pts = [[x, y]];
  for (let i = 0; i <= rays; i++) {
    const a = angle - fov / 2 + (fov * i) / rays;
    const d = raycast(level, x, y, a, range);
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  return pts;
}

// Is point (px,py) inside a vision cone from (x,y,angle,fov,range)?
export function insideCone(level, x, y, angle, fov, range, px, py) {
  const dx = px - x, dy = py - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist < 1) return false;
  let da = Math.atan2(dy, dx) - angle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  if (Math.abs(da) > fov / 2) return false;
  return hasLineOfSight(level, x, y, px, py);
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
