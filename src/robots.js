// The three robots: physics tuned per model sheet, and top-down drawing.
import { moveCircle } from './physics.js';

// r: the robot's footprint (radius in map units, 1 unit ≈ 7 cm): Voxxy Ø 0.85 m, Droid Ø 0.9 m, Biggy Ø 1.3 m, about 30% larger
// than the real robots (Ø 0.65, 0.7 and 1 m) so that they stand out in the crowd (an attendee is Ø 0.55–0.75 m).
// max: top speed in units/s (× 0.07 for m/s); accel, drag and turn give each one its feel.
// each robot's own colour: its energy ring on the map and the bar on its card (red when it runs low)
export const COLORS = { voxxy: '#ff9a2e', droid: '#ffd27a', biggy: '#8fb0d8' }, LOW = '#ff3b3b', LOW_BELOW = 30;

export const SPECS = {
  voxxy: {
    name: 'Voxxy', key: '1', mass: 1, r: 6.07, accel: 700, max: 110, drag: 6.5, turn: 14,
    role: 'The technician',
  },
  droid: {
    name: 'Droid', key: '2', mass: 4, r: 6.43, accel: 170, max: 72, drag: 5, turn: 3.0,
    role: 'The guide',
  },
  biggy: {
    name: 'Biggy', key: '3', mass: 10, r: 9.29, accel: 52, max: 80, drag: 0.5, brake: 1.25, turn: 2.6,
    role: 'Security',
  },
};

const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export class Robot {
  constructor(kind, x, y) {
    Object.assign(this, SPECS[kind]);
    this.kind = kind;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.heading = 0; this.walk = 0; this.speed = 0;
    this.trail = []; this.trailT = 0; this.crumb = 0;
    this.patience = 100; this.rogue = false; this.rebootT = 0;
    this.coffeeBoost = 0; this.coffeeTimer = 0;
  }

  update(dt, ix, iy, grid, fx) {
    if (this.coffeeBoost > 0) this.coffeeBoost = Math.max(0, this.coffeeBoost - dt);
    const topSpd = this.max * (this.coffeeBoost > 0 ? 1.25 : 1.0) * (this.rogue ? 0.4 : 1); // worn out: it trundles
    const has = ix || iy;
    if (this.kind === 'droid') {
      // Deliberate: turns in place, only walks where it is facing.
      let sp = Math.hypot(this.vx, this.vy);
      if (has) {
        const want = Math.atan2(iy, ix), diff = angDiff(this.heading, want);
        this.heading += Math.max(-this.turn * dt, Math.min(this.turn * dt, diff));
        if (Math.abs(diff) < 0.6) sp += this.accel * (this.coffeeBoost > 0 ? 1.25 : 1) * Math.cos(diff) * dt;
      }
      sp *= Math.exp(-this.drag * dt * (has ? 0.3 : 1));
      sp = Math.min(sp, topSpd);
      // keep external impulses but steer them toward the heading
      const hx = Math.cos(this.heading), hy = Math.sin(this.heading);
      this.vx += (hx * sp - this.vx) * Math.min(1, dt * 8);
      this.vy += (hy * sp - this.vy) * Math.min(1, dt * 8);
    } else {
      if (has) {
        const l = Math.hypot(ix, iy);
        this.vx += (ix / l) * this.accel * (this.coffeeBoost > 0 ? 1.25 : 1) * dt;
        this.vy += (iy / l) * this.accel * (this.coffeeBoost > 0 ? 1.25 : 1) * dt;
      }
      const drag = has ? this.drag : (this.brake || this.drag);
      const k = Math.exp(-drag * dt);
      this.vx *= k; this.vy *= k;
      const s = Math.hypot(this.vx, this.vy);
      if (s > topSpd) { this.vx *= topSpd / s; this.vy *= topSpd / s; }
      if (s > 4) {
        const want = Math.atan2(this.vy, this.vx);
        const turn = this.turn * dt;
        this.heading += Math.max(-turn, Math.min(turn, angDiff(this.heading, want)));
      }
    }

    const impact = moveCircle(grid, this, dt, this.kind === 'biggy' ? 0.15 : 0.3);
    this.speed = Math.hypot(this.vx, this.vy);
    const prevWalk = this.walk;
    this.walk += this.speed * dt * (this.kind === 'voxxy' ? 0.55 : this.kind === 'droid' ? 0.2 : 0.16);
    if (Math.floor(prevWalk / Math.PI) !== Math.floor(this.walk / Math.PI)) fx.step(this);
    if (impact > 25) fx.wallHit(this, impact);

    // breadcrumb trail so escorted attendees can follow around corners
    this.trailT += dt;
    if (this.trailT > 0.08 && this.speed > 5) {
      this.trailT = 0;
      this.trail.unshift({ x: this.x, y: this.y, id: ++this.crumb });
      if (this.trail.length > 120) this.trail.pop();
    }
  }
}

// ------------------------------------------------------------------ drawing
// Local frame: +x is where the robot faces. Top-down, light from top-left.

function ell(ctx, x, y, rx, ry, fill, stroke, lw = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function gloss(ctx, x, y, rx, ry, a = 0.35) {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ell(ctx, x, y, rx, ry, g);
}

// ------------------------------------------------------------------ front views
// Portraits for the title, the robot choice and the cards: standing, seen from the front, as on the
// official model sheets. (cx, top) is the top centre of the figure, h its height.
export function drawRobotFront(ctx, kind, cx, top, h, t = 0) {
  ctx.save(); ctx.translate(cx, top); ctx.scale(h / 100, h / 100); // draw on a 100-unit-tall figure
  ell(ctx, 0, 99, kind === 'biggy' ? 34 : 24, 3, 'rgba(0,0,0,0.35)'); // shadow
  const glow = (x, y, r, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4); ell(ctx, x, y, r, r * 0.8, '#fff3d6'); };
  if (kind === 'voxxy') {
    const O = '#f08a1c', Od = '#c96a0c';
    // legs and feet
    for (const sx of [-1, 1]) { ctx.strokeStyle = '#1b1b1f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(sx * 7, 80); ctx.lineTo(sx * 8, 94); ctx.stroke(); ell(ctx, sx * 9, 96, 5, 2.6, O); }
    // arms: thin black upper arm, orange forearm with a white band, black claws
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = '#1b1b1f'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx * 13, 50); ctx.lineTo(sx * 23, 64); ctx.stroke();
      ctx.save(); ctx.translate(sx * 26, 76); ctx.rotate(sx * -0.12);
      rrect(ctx, -5.5, -14, 11, 26, 5.5, O); ctx.fillStyle = '#f2efe9'; ctx.fillRect(-5.5, -4, 11, 5);
      ctx.fillStyle = '#1b1b1f'; for (const fx of [-3.5, 0, 3.5]) { ctx.beginPath(); ctx.arc(fx, 14, 1.8, 0, 7); ctx.fill(); }
      ctx.restore();
    }
    // pear-shaped body with the cat logo
    ctx.fillStyle = O; ctx.beginPath(); ctx.moveTo(-9, 45); ctx.bezierCurveTo(-20, 55, -19, 82, 0, 84); ctx.bezierCurveTo(19, 82, 20, 55, 9, 45); ctx.closePath(); ctx.fill();
    gloss(ctx, -3, 62, 13, 18, 0.3);
    ctx.fillStyle = '#fff4e6'; ctx.beginPath(); ctx.arc(-5, 55, 3.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, 53); ctx.lineTo(-7.5, 50.5); ctx.lineTo(-6, 52.5); ctx.fill(); ctx.beginPath(); ctx.moveTo(-2, 53); ctx.lineTo(-2.5, 50.5); ctx.lineTo(-4, 52.5); ctx.fill();
    rrect(ctx, -2, 42, 4, 5, 1, '#1b1b1f'); // neck
    // head: round ears, white side discs, the black visor with two glowing eyes
    for (const sx of [-1, 1]) { ell(ctx, sx * 20, 7, 6.5, 6, O); ell(ctx, sx * 20, 8, 3.5, 3, Od); }
    ell(ctx, 0, 24, 32, 19, O);
    for (const sx of [-1, 1]) { ell(ctx, sx * 31, 24, 5, 8, '#f2efe9'); ell(ctx, sx * 32.5, 24, 1.8, 4, '#1b1b1f'); }
    rrect(ctx, -22, 14, 44, 20, 10, '#0c0c10');
    glow(-10, 24, 3.2, 'rgba(255,150,40,0.9)'); glow(10, 24, 3.2, 'rgba(255,150,40,0.9)');
    gloss(ctx, -8, 16, 24, 10, 0.35);
  } else if (kind === 'droid') {
    const D = '#3b414b', Dd = '#262b33', R = '#8a6a44';
    // long legs and flat feet
    for (const sx of [-1, 1]) { rrect(ctx, sx * 8 - 3.5, 58, 7, 34, 3, D); ell(ctx, sx * 8, 75, 4, 4, Dd); rrect(ctx, sx * 8 - 5, 92, 10, 5, 2, Dd); }
    // pelvis: a V plate
    ctx.fillStyle = Dd; ctx.beginPath(); ctx.moveTo(-12, 50); ctx.lineTo(12, 50); ctx.lineTo(4, 60); ctx.lineTo(-4, 60); ctx.closePath(); ctx.fill();
    rrect(ctx, -4, 40, 8, 12, 2, '#1f232a'); // the spine between chest and pelvis
    // long arms hanging down to the knees
    for (const sx of [-1, 1]) { rrect(ctx, sx * 22 - 3, 26, 6, 22, 3, D); ell(ctx, sx * 22, 49, 3, 3, Dd); rrect(ctx, sx * 23 - 2.5, 50, 5, 20, 2.5, D); ctx.strokeStyle = Dd; ctx.lineWidth = 1.6; for (const f of [-2, 0, 2]) { ctx.beginPath(); ctx.moveTo(sx * 23 + f, 70); ctx.lineTo(sx * 23 + f * 1.4, 75); ctx.stroke(); } }
    // chest plate with the weathered copper shoulder rings
    ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(-19, 22); ctx.lineTo(19, 22); ctx.lineTo(15, 42); ctx.lineTo(-15, 42); ctx.closePath(); ctx.fill();
    for (const sx of [-1, 1]) { ell(ctx, sx * 20, 26, 6, 6, R); ell(ctx, sx * 20, 26, 4, 4, D); }
    rrect(ctx, -5, 28, 10, 8, 1.5, Dd);
    gloss(ctx, -5, 28, 13, 9, 0.18);
    rrect(ctx, -1.5, 15, 3, 7, 1, Dd); // neck
    // the small domed head, two glowing eyes, the jaw grille
    ctx.fillStyle = D; ctx.beginPath(); ctx.moveTo(-7.5, 15); ctx.lineTo(-8.5, 5); ctx.quadraticCurveTo(0, -3, 8.5, 5); ctx.lineTo(7.5, 15); ctx.closePath(); ctx.fill();
    glow(-3.4, 8, 1.4, 'rgba(255,215,120,0.95)'); glow(3.4, 8, 1.4, 'rgba(255,215,120,0.95)');
    ctx.fillStyle = Dd; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 1.6 - 0.5, 11.5, 1, 3);
    gloss(ctx, -2, 4, 6, 4, 0.2);
  } else {
    const B = '#4a5a6e', Bd = '#33404f', O = '#c8653a';
    // short legs and big feet
    for (const sx of [-1, 1]) { rrect(ctx, sx * 12 - 5, 84, 10, 10, 3, '#2a2f37'); rrect(ctx, sx * 12 - 7, 92, 14, 6, 3, '#1e2228'); }
    // thick armoured arms with dark hands
    for (const sx of [-1, 1]) { rrect(ctx, sx * 36 - 7, 42, 14, 34, 6, B); rrect(ctx, sx * 36 - 5, 74, 10, 10, 4, '#23272e'); }
    // the rusty orange belly with its logo
    ell(ctx, 0, 60, 32, 29, O);
    ctx.globalAlpha = 0.35; for (const [rx, ry, rr] of [[-14, 52, 7], [12, 70, 9], [-6, 78, 6], [18, 50, 5]]) ell(ctx, rx, ry, rr, rr * 0.7, '#6d3b27'); ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 38); ctx.lineTo(0, 88); ctx.stroke();
    ell(ctx, 0, 49, 5.5, 5.5, null, '#f1ece4', 1.4); ctx.fillStyle = '#f1ece4'; ctx.fillRect(-2.4, 46.5, 1.4, 5); ctx.fillRect(1, 46.5, 1.4, 5);
    gloss(ctx, -8, 52, 24, 22, 0.25);
    // the blue-grey helmet with rivets, two round "eyes" and an antenna
    ctx.strokeStyle = '#2a2f37'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(3, -6); ctx.stroke();
    ctx.fillStyle = B; ctx.beginPath(); ctx.moveTo(-34, 36); ctx.quadraticCurveTo(-34, 6, 0, 5); ctx.quadraticCurveTo(34, 6, 34, 36); ctx.lineTo(26, 40); ctx.lineTo(-26, 40); ctx.closePath(); ctx.fill();
    rrect(ctx, -27, 30, 54, 7, 3, Bd);
    for (const sx of [-1, 1]) { ell(ctx, sx * 9, 21, 4.2, 4.2, '#8d96a3'); ell(ctx, sx * 9, 21, 2.4, 2.4, '#1c2026'); ell(ctx, sx * 26, 30, 3, 3, O); }
    for (const rx of [-18, 18]) ell(ctx, rx, 14, 1.2, 1.2, '#98a1ae');
    gloss(ctx, -8, 14, 20, 10, 0.25);
  }
  ctx.restore();
}

// eyes go from their normal colour to yellow, then red as energy (`patience`) runs out
export function moodEye(rb, base) {
  if (rb.rogue) return '#ff7ad9';
  const p = rb.patience ?? 100;
  if (p > 60) return base;
  if (p > 30) return '#ffe14a';
  return '#ff6a2a';
}

// the top-down art was drawn for these radii: it is scaled to each robot's real footprint, so every detail keeps its proportions
const ART_R = { voxxy: 9, droid: 10, biggy: 16 };

export function drawRobot(ctx, rb, t, opts = {}) {
  const { r } = rb;
  const jit = rb.rogue ? 0.8 : (rb.patience ?? 100) < 30 ? 0.35 : 0;
  const x = rb.x + (Math.random() - 0.5) * jit, y = rb.y + (Math.random() - 0.5) * jit;
  ctx.save();
  ctx.translate(x, y);
  // contact shadow; the tall Droid casts a longer one
  const sh = rb.kind === 'droid' ? 1.7 : 1.15;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(r * 0.25 * sh, r * 0.35 * sh, r * 1.15 * (rb.kind === 'droid' ? 1.1 : 1), r * 1.0, 0, 0, Math.PI * 2);
  ctx.fill();
  if (opts.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -t * 20;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.rotate(rb.heading + (rb.hitT > 0 ? Math.sin(rb.hitT * 55) * rb.hitT * 0.5 : 0)); // flinch when a pest gets it
  const bob = Math.sin(rb.walk * 2) * (rb.speed > 3 ? 1 : 0);
  const ar = ART_R[rb.kind] || r;
  ctx.scale(r / ar, r / ar);
  if (rb.kind === 'voxxy') drawVoxxy(ctx, ar, rb.walk, t, bob, moodEye(rb, '#ffb050'));
  else if (rb.kind === 'droid') drawDroid(ctx, ar, rb.walk, t, moodEye(rb, '#ffdc8c'));
  else drawBiggy(ctx, ar, rb.walk, t, rb);
  ctx.restore();
}

function drawVoxxy(ctx, r, walk, t, bob, eye) {
  const sw = Math.sin(walk) * r * 0.35;
  const O = '#f28a1c', OD = '#b85d0a';
  // long articulated arms with white bands
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-r * 0.1 + sw * s, s * r * 1.02);
    rrect(ctx, -r * 0.45, -r * 0.2, r * 0.9, r * 0.4, r * 0.2, O, OD);
    ctx.fillStyle = '#f4f1ec';
    ctx.fillRect(-r * 0.05, -r * 0.2, r * 0.22, r * 0.4);
    ell(ctx, r * 0.5, 0, r * 0.14, r * 0.14, '#222');
    ctx.restore();
  }
  // body peeking out behind the head
  ell(ctx, -r * 0.45, 0, r * 0.6, r * 0.7, OD);
  // big rounded head
  const hs = 1 + bob * 0.02;
  ell(ctx, r * 0.1, 0, r * 1.0 * hs, r * 1.08 * hs, O, OD);
  // bear ears
  for (const s of [-1, 1]) { ell(ctx, -r * 0.3, s * r * 0.72, r * 0.26, r * 0.26, O, OD); ell(ctx, -r * 0.3, s * r * 0.72, r * 0.12, r * 0.12, '#fff3e6'); }
  // white side pods with orange ring eye
  for (const s of [-1, 1]) { ell(ctx, r * 0.15, s * r * 1.02, r * 0.3, r * 0.2, '#f4f1ec', '#999'); ell(ctx, r * 0.18, s * r * 1.08, r * 0.1, r * 0.08, '#ff9d3a'); }
  gloss(ctx, r * 0.1, 0, r, r * 1.08, 0.55);
  // black visor + glowing eyes
  ctx.save();
  ctx.beginPath(); ctx.ellipse(r * 0.1, 0, r * 1.0, r * 1.08, 0, 0, Math.PI * 2); ctx.clip();
  ell(ctx, r * 0.9, 0, r * 0.5, r * 0.88, '#0d0d10');
  ctx.restore();
  const blink = (Math.sin(t * 1.3) > 0.985) ? 0.2 : 1;
  for (const s of [-1, 1]) {
    ctx.shadowColor = eye; ctx.shadowBlur = 8;
    ell(ctx, r * 0.82, s * r * 0.36, r * 0.12, r * 0.17 * blink, eye);
    ctx.shadowBlur = 0;
  }
}

function drawDroid(ctx, r, walk, t, eye) {
  const sw = Math.sin(walk) * r * 0.55;
  const G = '#4d535e', GD = '#1c1f24', RUST = '#a8683a';
  // legs (only visible when striding)
  for (const s of [-1, 1]) rrect(ctx, sw * s - r * 0.2, s * r * 0.38 - r * 0.14, r * 0.5, r * 0.28, 2, '#2a2e34');
  // long arms, swinging opposite to legs
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-sw * s * 0.8, s * r * 1.12);
    rrect(ctx, -r * 0.5, -r * 0.14, r * 1.1, r * 0.28, 3, '#434852', GD);
    ell(ctx, -r * 0.05, 0, r * 0.12, r * 0.12, '#555b66');
    ell(ctx, r * 0.66, 0, r * 0.16, r * 0.13, '#23262b');
    ctx.restore();
  }
  // broad chest plate, weathered
  rrect(ctx, -r * 0.55, -r * 0.98, r * 1.0, r * 1.96, r * 0.35, G, GD);
  ctx.strokeStyle = 'rgba(200,210,225,0.35)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.roundRect(-r * 0.52, -r * 0.95, r * 0.94, r * 1.9, r * 0.33); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  [[-0.3, -0.5], [0.1, 0.4], [-0.2, 0.6]].forEach(([a, b]) => ctx.fillRect(a * r, b * r, r * 0.25, 1.2));
  // shoulder rings (rust)
  for (const s of [-1, 1]) { ell(ctx, -r * 0.08, s * r * 0.86, r * 0.3, r * 0.3, '#30343b', RUST, 2); }
  // back panel
  rrect(ctx, -r * 0.5, -r * 0.3, r * 0.3, r * 0.6, 2, '#2c3037');
  // head dome
  ell(ctx, r * 0.28, 0, r * 0.44, r * 0.4, '#3b4049', GD);
  gloss(ctx, r * 0.28, 0, r * 0.44, r * 0.4, 0.25);
  const pulse = 0.75 + Math.sin(t * 2) * 0.25;
  ctx.shadowColor = eye; ctx.shadowBlur = 7;
  ctx.globalAlpha = pulse;
  for (const s of [-1, 1]) ell(ctx, r * 0.62, s * r * 0.14, r * 0.08, r * 0.08, eye);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawBiggy(ctx, r, walk, t, rb) {
  const sw = Math.sin(walk) * r * 0.12;
  const B = '#4b5b6d', BD = '#2c3642', OR = '#c4623a';
  // stubby blocky arms
  for (const s of [-1, 1]) rrect(ctx, -r * 0.35 + sw * s, s * r * 0.95 - r * 0.22, r * 0.75, r * 0.44, 4, B, BD);
  // orange belly bulging at the front
  ell(ctx, r * 0.32, 0, r * 0.72, r * 0.82, OR, '#6e3218');
  ctx.fillStyle = 'rgba(60,40,30,0.35)';
  [[0.5, -0.3, 0.2], [0.2, 0.45, 0.15], [0.75, 0.2, 0.12]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(a * r, b * r, c * r, 0, 7); ctx.fill(); });
  // "ii" badge
  ell(ctx, r * 0.78, 0, r * 0.16, r * 0.16, null, '#f1e6dc', 1.5);
  ctx.fillStyle = '#f1e6dc'; ctx.fillRect(r * 0.72, -r * 0.07, 2, r * 0.14); ctx.fillRect(r * 0.8, -r * 0.07, 2, r * 0.14);
  // armoured dome
  ell(ctx, -r * 0.15, 0, r * 0.82, r * 0.92, B, BD, 1.5);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 0.5, r * 0.92, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.95, 0); ctx.lineTo(r * 0.65, 0); ctx.stroke();
  // brow band + rivet "eyes"
  ctx.strokeStyle = '#222a33'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 0.82, r * 0.92, 0, -0.9, 0.9); ctx.stroke();
  const eye = moodEye(rb, '#6f7c8a');
  for (const [a, b] of [[0.35, -0.35], [0.35, 0.35]]) { ctx.shadowColor = eye; ctx.shadowBlur = eye === '#6f7c8a' ? 0 : 6; ell(ctx, a * r, b * r, 2.4, 2.4, eye, '#1d242c'); }
  ctx.shadowBlur = 0;
  for (const [a, b] of [[-0.5, -0.4], [-0.5, 0.4]]) ell(ctx, a * r, b * r, 2.2, 2.2, '#6f7c8a', '#1d242c');
  ctx.fillStyle = 'rgba(196,98,58,0.5)';
  ctx.beginPath(); ctx.arc(r * 0.2, r * 0.75, 3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.75, 3, 0, 7); ctx.fill();
  gloss(ctx, -r * 0.15, 0, r * 0.82, r * 0.92, 0.18);
  // antenna tip
  ell(ctx, -r * 0.55, -r * 0.1, 1.6, 1.6, (Math.sin(t * 4) > 0) ? '#ff5a3a' : '#5a2a20');
}
