import { W, H, CELL, GW } from './level.js';

const DIRS = Array.from({ length: 8 }, (_, a) => [Math.cos(a * Math.PI / 4), Math.sin(a * Math.PI / 4)]);

export function solidAt(grid, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return true;
  return grid[Math.floor(y / CELL) * GW + Math.floor(x / CELL)] !== 0;
}

export function blockedCircle(grid, x, y, r) {
  if (solidAt(grid, x, y)) return true;
  for (const [dx, dy] of DIRS) if (solidAt(grid, x + dx * r, y + dy * r)) return true;
  return false;
}

// Only the leading half of the circle can block a move along one axis,
// so bodies resting against a wall still slide along it.
const LEAD = [0, 0.38, -0.38, 0.71, -0.71, 0.92, -0.92, 1, -1];
function blockedAxis(grid, x, y, r, sx, sy) {
  if (solidAt(grid, x, y)) return true;
  for (const o of LEAD) {
    const f = Math.sqrt(1 - o * o);
    const px = sx ? x + sx * r * f : x + o * r;
    const py = sy ? y + sy * r * f : y + o * r;
    if (f < 0.3) continue; // points square to the motion can't block it
    if (solidAt(grid, px, py)) return true;
  }
  return false;
}

// Axis-separated move against the grid. Returns the speed lost on impact.
export function moveCircle(grid, b, dt, restitution = 0) {
  let impact = 0;
  const stuck = blockedCircle(grid, b.x, b.y, b.r * 0.5); // spawned inside something: let it walk out
  const nx = b.x + b.vx * dt;
  if (stuck || !b.vx || !blockedAxis(grid, nx, b.y, b.r, Math.sign(b.vx), 0)) b.x = nx;
  else { impact = Math.max(impact, Math.abs(b.vx)); b.vx *= -restitution; }
  const ny = b.y + b.vy * dt;
  if (stuck || !b.vy || !blockedAxis(grid, b.x, ny, b.r, 0, Math.sign(b.vy))) b.y = ny;
  else { impact = Math.max(impact, Math.abs(b.vy)); b.vy *= -restitution; }
  return impact;
}

// A body caught on a corner (a door jamb) along the way it was going: it steps sideways, a unit at a time, towards the
// nearer side where the way ahead is clear. vx, vy: its velocity before the move that got blocked. Only the way it mostly goes
// counts: brushing along a wall (a railing it walks past) is no reason to step back from it.
export function unsnag(grid, b, vx, vy, dt) {
  if (vy && !b.vy && Math.abs(vy) >= Math.abs(vx)) sidestep(grid, b, 0, Math.sign(vy), Math.abs(vy) * dt + 0.5);
  if (vx && !b.vx && Math.abs(vx) >= Math.abs(vy)) sidestep(grid, b, Math.sign(vx), 0, Math.abs(vx) * dt + 0.5);
}
function sidestep(grid, b, sx, sy, ahead) {
  for (let off = 1; off <= b.r; off++) for (const k of [1, -1]) {
    const ox = sy ? k * off : 0, oy = sx ? k * off : 0; // across the way it was going
    if (blockedAxis(grid, b.x + ox + sx * ahead, b.y + oy + sy * ahead, b.r, sx, sy)) continue; // still caught from there
    const mx = Math.sign(ox), my = Math.sign(oy);
    if (!blockedAxis(grid, b.x + mx, b.y + my, b.r * 0.8, mx, my)) { b.x += mx; b.y += my; } // as much overlap as a nudge allows
    return;
  }
}

// Positional nudge that refuses to push a body into a wall.
export function nudge(grid, b, dx, dy) {
  if (dx && !blockedAxis(grid, b.x + dx, b.y, b.r * 0.8, Math.sign(dx), 0)) b.x += dx;
  if (dy && !blockedAxis(grid, b.x, b.y + dy, b.r * 0.8, 0, Math.sign(dy))) b.y += dy;
}

// Mass-weighted circle/circle contact. Returns closing speed (for bump detection).
export function collide(grid, a, b, ma, mb, gridB = grid) { // gridB: b's walls, when they differ (the attendees')
  const dx = b.x - a.x, dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min || d2 < 1e-6) return 0;
  const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = min - d;
  const ia = 1 / ma, ib = 1 / mb, s = ia + ib;
  nudge(grid, a, -nx * over * ia / s, -ny * over * ia / s);
  nudge(gridB, b, nx * over * ib / s, ny * over * ib / s);
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const j = -(1.1 * rv) / s;
    a.vx -= j * ia * nx; a.vy -= j * ia * ny;
    b.vx += j * ib * nx; b.vy += j * ib * ny;
  }
  return -rv;
}
