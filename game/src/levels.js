// Velvet Heist — the three heist locations.
// One clear job: map strings plus guard patrols and camera mounts.
// Legend: # wall, . marble, C carpet (quiet), S shadow (hard to spot),
// + doorway, P thief start, D exit, L painting ($150), G gem ($250),
// $ safe ($500), H hack panel.
import { LOOT_VALUES } from './config.js';

export { LOOT_VALUES };

export const LEVELS = [
  {
    name: 'The Meridian Gallery',
    sub: 'Steal the Starling portraits — slip out before dawn.',
    quota: 700,
    par: 150,
    seed: 1101,
    map: [
      '################################',
      '#P....#.......#......#......L..#',
      '#.....#...L...#..G...#....$....#',
      '#..S..#.......#......#.........#',
      '#.....+.......+..S...+....C....#',
      '#.....#.......#......#.........#',
      '#..C..#...S...#..L...#....L....#',
      '#.....#.......#......#.........#',
      '###.####.######.######.####.####',
      '#..............................#',
      '#..L......C....H...S......G....#',
      '#..............................#',
      '#.#####.########.#######.#######',
      '#.....#........#.......#.......#',
      '#..$..#...L....#...$...#..C....#',
      '#..S..#........#.......#.......#',
      '#.....+....C...+...S...+..L....#',
      '#.....#........#.......#.......#',
      '#..D..#........#.......#.......#',
      '################################',
    ],
    guards: [
      { path: [[4, 9], [28, 9]], pause: 1.2 },
      { path: [[10, 2], [10, 6], [25, 6], [25, 2]], pause: 1.6 },
    ],
    cameras: [{ tx: 14, ty: 8, angle: Math.PI / 2, sweep: 1.5 }],
  },
  {
    name: 'The Obsidian Vault',
    sub: 'The vault sleeps behind glass and lasers. Crack it.',
    quota: 1300,
    par: 180,
    seed: 2202,
    map: [
      '################################',
      '#P..S.#......#.......#....G....#',
      '#.....#..L...#...$...#.........#',
      '#..C..#......#.......#...C.....#',
      '#.....+..S...+...L...+....$....#',
      '#.....#......#.......#.........#',
      '#..L..#..C...#...S...#....L....#',
      '#.....#......#.......#.........#',
      '###.#####.#######.######.###.#.#',
      '#..............................#',
      '#..$.....H......C......S...G...#',
      '#..............................#',
      '#.######.########.#######.####.#',
      '#......#.......#.......#.......#',
      '#..G...#...L...#...$...#..L....#',
      '#..S...#.......#.......#.......#',
      '#......+...C...+...S...+..C....#',
      '#......#.......#.......#.......#',
      '#..D...#.......#.......#..$....#',
      '################################',
    ],
    guards: [
      { path: [[3, 9], [29, 9]], pause: 1.0 },
      { path: [[9, 2], [9, 6], [22, 6], [22, 2]], pause: 1.4 },
      { path: [[9, 14], [9, 18], [22, 18], [22, 14]], pause: 1.4 },
    ],
    cameras: [
      { tx: 15, ty: 8, angle: Math.PI / 2, sweep: 1.7 },
      { tx: 24, ty: 12, angle: -Math.PI / 2, sweep: 1.4 },
    ],
  },
  {
    name: 'The Sky Penthouse',
    sub: 'One last job. The Starling diamond, forty floors up.',
    quota: 2000,
    par: 210,
    seed: 3303,
    map: [
      '################################',
      '#P....#....L..#......#....G....#',
      '#..S..#.......#..$...#.........#',
      '#.....#...C...#......#....C....#',
      '#..L..+.......#..S...+....$....#',
      '#.....#.......#......#.........#',
      '#..C..#...S...#..L...#....L....#',
      '#.....#.......#......#.........#',
      '###.####.######.######.####.####',
      '#..............................#',
      '#..G.....C.......H......S..$...#',
      '#..............................#',
      '#.#####.########.#######.#######',
      '#.....#........#.......#.......#',
      '#..$..#...L....#...G...#..C....#',
      '#.....#........#.......#.......#',
      '#..S..+....C...+...S...+..L....#',
      '#.....#........#.......#.......#',
      '#..D..#........#.......#..$....#',
      '################################',
    ],
    guards: [
      { path: [[3, 9], [29, 9]], pause: 0.8 },
      { path: [[10, 2], [10, 6], [25, 6], [25, 2]], pause: 1.2 },
      { path: [[10, 14], [10, 18], [25, 18], [25, 14]], pause: 1.2 },
      { path: [[16, 10], [16, 17], [28, 17], [28, 10]], pause: 1.0 },
    ],
    cameras: [
      { tx: 14, ty: 8, angle: Math.PI / 2, sweep: 1.8 },
      { tx: 8, ty: 12, angle: -Math.PI / 2, sweep: 1.5 },
      { tx: 23, ty: 12, angle: -Math.PI / 2, sweep: 1.5 },
    ],
  },
];

// Validate every level: 32-wide rows, all loot/exit/panel tiles reachable
// from the thief start, guard waypoints on floor. Throws on first problem.
export function validateLevels() {
  const problems = [];
  for (const level of LEVELS) {
    const rows = level.map;
    if (rows.length !== 20) problems.push(`${level.name}: ${rows.length} rows, want 20`);
    rows.forEach((row, y) => {
      if (row.length !== 32) problems.push(`${level.name} row ${y}: ${row.length} chars, want 32`);
    });
    const walkable = (x, y) => x >= 0 && y >= 0 && x < 32 && y < 20 && rows[y][x] !== '#';
    let start = null;
    const targets = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === 'P') start = [x, y];
        if ('LG$DH'.includes(c)) targets.push([x, y, c]);
      }
    });
    if (!start) problems.push(`${level.name}: no P start`);
    if (start) {
      const seen = new Set([start.join(',')]);
      const queue = [start];
      while (queue.length) {
        const [x, y] = queue.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (walkable(nx, ny) && !seen.has(`${nx},${ny}`)) {
            seen.add(`${nx},${ny}`);
            queue.push([nx, ny]);
          }
        }
      }
      for (const [x, y, c] of targets) {
        if (!seen.has(`${x},${y}`)) problems.push(`${level.name}: ${c} at ${x},${y} unreachable`);
      }
      for (const g of level.guards) {
        for (const [x, y] of g.path) {
          if (!walkable(x, y)) problems.push(`${level.name}: guard waypoint ${x},${y} is a wall`);
        }
      }
      for (const c of level.cameras) {
        if (rows[c.ty][c.tx] !== '#') problems.push(`${level.name}: camera at ${c.tx},${c.ty} not on a wall`);
      }
    }
  }
  return problems;
}
