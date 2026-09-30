// Attendees. Each one is a small AI with a personality:
//   walker  – going to a talk (flow-field steering)
//   lost    – ❓ wandering, only follows Droid (the guide) to their room
//   pest    – 📸 🔧 hunts one particular robot and drains its patience
//   nice    – 😊 hangs around; robots near them calm down
import { W, H, GW, GH, CELL, roomByN, floorOf } from './level.js';
import { moveCircle, nudge, collide, unsnag } from './physics.js';

const HC = 16, HW = Math.ceil(W / HC), HH = Math.ceil(H / HC);
const MAX = 1200;
const AGENT_MASS = 0.7;
const tmp = { x: 0, y: 0 };

export class Crowd {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.head = new Int32Array(HW * HH).fill(-1); // empty until the first rebuild (0 would point at agent 0 forever)
    this.next = new Int32Array(MAX);
    this.density = new Uint8Array(GW * GH);
  }

  spawn(x, y, kind, extra = {}) {
    if (this.list.length >= MAX) return null;
    const a = {
      x, y, vx: 0, vy: 0, r: 3.9 + Math.random() * 1.45, kind, // Ø 0.55–0.75 m (1 unit ≈ 7 cm)
      dest: 'room:3', final: 'room:3',
      pref: 22 + Math.random() * 10,
      state: 'walk', timer: 0, bumpCD: 0,
      shirt: SHIRTS[(Math.random() * SHIRTS.length) | 0],
      wander: Math.random() * 7, homeX: x, homeY: y,
      ...extra,
    };
    this.list.push(a);
    return a;
  }

  forEachNear(x, y, rad, fn) {
    const x0 = Math.max(0, Math.floor((x - rad) / HC)), x1 = Math.min(HW - 1, Math.floor((x + rad) / HC));
    const y0 = Math.max(0, Math.floor((y - rad) / HC)), y1 = Math.min(HH - 1, Math.floor((y + rad) / HC));
    for (let hy = y0; hy <= y1; hy++) for (let hx = x0; hx <= x1; hx++)
      for (let i = this.head[hy * HW + hx]; i !== -1; i = this.next[i]) fn(this.list[i], i);
  }

  rebuild() {
    this.head.fill(-1);
    this.density.fill(0);
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      const h = Math.min(HH - 1, Math.max(0, (a.y / HC) | 0)) * HW + Math.min(HW - 1, Math.max(0, (a.x / HC) | 0));
      this.next[i] = this.head[h]; this.head[h] = i;
      const c = Math.floor(a.y / CELL) * GW + Math.floor(a.x / CELL);
      if (this.density[c] < 255) this.density[c]++;
    }
  }

  update(dt) {
    const g = this.g, L = this.list;
    this.rebuild();
    const voxxy = g.robots.voxxy, guide = g.robots.droid;

    // 1. what does each person want to do?
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      a.bumpCD -= dt;
      let dvx = 0, dvy = 0;
      if (a.state === 'wait' || a.state === 'stumble') {
        a.timer -= dt;
        if (a.timer <= 0) { a.state = a.kind === 'pest' && !a.leaving ? 'pester' : 'walk'; a.dest = a.final === 'hang' ? g.nextHangout(a) : a.final; } // the hallway track: on to the next spot
      } else if (a.state === 'queue') { // in line for the toilets: step up to their place in it
        const tx = (a.qx ?? a.x) - a.x, ty = (a.qy ?? a.y) - a.y, l = Math.hypot(tx, ty), sp = l > 2 ? Math.min(a.pref, l * 3) : 0;
        if (l > 0.01) { dvx = tx / l * sp; dvy = ty / l * sp; }
      } else if (a.state === 'idle') {
        // lost or nice: drift around a home spot
        a.wander += (Math.random() - 0.5) * dt * 3;
        dvx = Math.cos(a.wander) * 8 + (a.homeX - a.x) * 0.3;
        dvy = Math.sin(a.wander) * 8 + (a.homeY - a.y) * 0.3;
      } else if (a.state === 'follow') {
        // walk the guide's breadcrumbs in order, so corners are taken the same way
        const tr = guide.trail;
        let p = null;
        for (let k = tr.length - 1; k >= 0; k--) if (tr[k].id > a.crumbId) { p = tr[k]; break; }
        if (p && Math.hypot(p.x - a.x, p.y - a.y) < 7) a.crumbId = p.id;
        const dv = Math.hypot(guide.x - a.x, guide.y - a.y);
        const tgt = p || guide;
        let tx = tgt.x - a.x, ty = tgt.y - a.y;
        if (floorOf(tgt.y) !== floorOf(a.y)) { g.fields[floorOf(a.y) ? 'down' : 'up'].sample(a.x, a.y, tmp); tx = tmp.x * 50; ty = tmp.y * 50; a.viaStairs = g.t; }
        if (dv < 16 + a.followIdx * 10) { tx = 0; ty = 0; }
        const l = Math.hypot(tx, ty) || 1;
        const sp = Math.min(85, 25 + l * 3);
        dvx = tx / l * sp; dvy = ty / l * sp;
      } else if (a.state === 'pester') {
        const rb = g.robots[a.target];
        let dx = rb.x - a.x, dy = rb.y - a.y, d = Math.hypot(dx, dy) || 1;
        if (floorOf(rb.y) !== floorOf(a.y)) { g.fields[floorOf(a.y) ? 'down' : 'up'].sample(a.x, a.y, tmp); dx = tmp.x * 200; dy = tmp.y * 200; d = 200; a.viaStairs = g.t; }
        const keep = g.inLounge(rb) || g.inToilets(rb) ? 90 : rb.r + 9;   // staff-only lounge, or a toilet break: they wait outside
        const sp = d > keep + 4 ? a.pref * 1.25 : d < keep - 4 ? -25 : 0;
        a.wander += dt * 2;
        dvx = dx / d * sp + Math.cos(a.wander) * 4; dvy = dy / d * sp + Math.sin(a.wander) * 4;
      } else {
        let f = g.fields[a.dest];
        if (f.distAt(a.x, a.y) >= 1e8) { f = g.fields[floorOf(a.y) ? (a.dest === 'steps' ? 'downReception' : 'down') : 'up']; a.viaStairs = g.t; } // the other floor: stairs first (the attendees' own way, not through the service corridors)
        f.sample(a.x, a.y, tmp);
        let n = 0;
        this.forEachNear(a.x, a.y, 12, b => { if (b !== a) n++; });
        const dens = Math.max(0.22, Math.min(1, 1.2 - n * 0.075));
        const kr = n > 2 ? 0.28 : 0.1; // keep right: opposing flows form lanes
        dvx = (tmp.x - tmp.y * kr) * a.pref * dens; dvy = (tmp.y + tmp.x * kr) * a.pref * dens;
      }
      // people step aside for Biggy on the move: it clears a way through the crowd without touching anyone
      const big = g.robots.biggy, bd = Math.hypot(big.x - a.x, big.y - a.y);
      if (!big.rogue && bd < 36 && big.speed > 12 && a.state !== 'follow' && a.state !== 'pester') {
        const k = (36 - bd) / 36 * 40;
        dvx += (a.x - big.x) / (bd || 1) * k; dvy += (a.y - big.y) / (bd || 1) * k;
      }
      // and makes a little room for a calm Voxxy in a hurry
      const vd = Math.hypot(voxxy.x - a.x, voxxy.y - a.y);
      if (!voxxy.rogue && vd < 26 && a.state !== 'follow' && a.state !== 'pester' && voxxy.speed > 20) {
        const k = (26 - vd) / 26 * 30;
        dvx += (a.x - voxxy.x) / (vd || 1) * k; dvy += (a.y - voxxy.y) / (vd || 1) * k;
      }
      const s = Math.min(1, dt * 5);
      a.vx += (dvx - a.vx) * s; a.vy += (dvy - a.vy) * s;
    }

    // 2. integrate against walls
    for (const a of L) { const vx = a.vx, vy = a.vy; if (moveCircle(g.crowdGrid, a, dt) > 0) unsnag(g.crowdGrid, a, vx, vy, dt); } // caught on a door jamb: step around it
    for (const a of L) if (a.viaStairs > g.t - 0.3) g.takeStairs(a, dt); // only people heading for the other floor

    // 3. separation (position based, stable at high density)
    this.rebuild();
    for (let i = 0; i < L.length; i++) {
      const a = L[i];
      this.forEachNear(a.x, a.y, 11, (b, j) => { // two of the broadest shoulders (2 × 5.4)
        if (j <= i) return;
        const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) return;
        const d = Math.sqrt(d2) || 0.01, over = (min - d) * 0.5;
        const nx = d > 0.01 ? dx / d : Math.random() - 0.5, ny = d > 0.01 ? dy / d : Math.random() - 0.5;
        nudge(g.crowdGrid, a, -nx * over, -ny * over);
        nudge(g.crowdGrid, b, nx * over, ny * over);
      });
    }

    // 4. robots and people touch
    for (const rb of g.robotList) {
      this.forEachNear(rb.x, rb.y, rb.r + 7, a => {
        const closing = collide(g.wallGrid, rb, a, rb.mass, AGENT_MASS, g.crowdGrid); // a robot can't push anyone into the service corridors
        if (Math.hypot(rb.x - a.x, rb.y - a.y) < rb.r + a.r + 1.5) g.onTouch(rb, a, closing);
      });
    }

    // 5. arrivals
    for (let i = L.length - 1; i >= 0; i--) {
      const a = L[i];
      const c = Math.floor(a.y / CELL) * GW + Math.floor(a.x / CELL);
      let arrived = false;
      if (a.state === 'walk') {
        arrived = !!g.fields[a.dest].isTarget[c];
        if (!arrived && a.dest.startsWith('wc:')) { const e = g.toiletLineEnd(a); arrived = !!e && Math.hypot(e.x - a.x, e.y - a.y) < 10; } // the end of the line
      }
      else if (a.state === 'follow') {
        const r = roomByN[a.room];
        arrived = a.x > r.x0 && a.x < r.x1 && a.y > r.y0 && a.y < r.y1;
      }
      if (!arrived) continue;
      if (a.dest.startsWith('wc:') && a.state === 'walk') { g.toiletArrive(a); continue; } // the toilets: a line, then a stall
      if ((a.dest === 'coffee' || a.dest === 'tables' || a.dest === 'steps' || a.dest === 'polo' || a.dest === 'expo' || a.dest === 'hallcoffee') && a.final !== a.dest) { // a stop on the way to the talk
        // a chat at a table lasts longer, and sitting down on the steps longer still; skipping the talk, people stay a good while wherever they are
        a.state = 'wait'; a.timer = a.final === 'hang' ? 8 + Math.random() * 14 : a.dest === 'steps' ? 8 + Math.random() * 8 : a.dest === 'tables' ? 5 + Math.random() * 6 : 3 + Math.random() * 4; a.stop = a.dest; a.dest = 'coffee_hold';
        continue;
      }
      g.onArrive(a);
      L[i] = L[L.length - 1]; L.pop();
    }
  }
}

export const SHIRTS = ['#d9d4c7', '#2d3a4f', '#6b7b8c', '#8c2f39', '#1f1f24', '#4f6b3a', '#c9a227', '#3d5a80', '#a3a3a3', '#5e3a6e'];
// skin tones, from the lightest to the darkest: Devoxx is an international crowd
export const SKINS = ['#f5d7c0', '#ecc3a0', '#dca981', '#c68c62', '#a86f48', '#8a5536', '#6a3f27', '#4b2c1b'];
// each person's own tone, fixed for as long as they are on screen (from where they appeared: no extra random draw)
export const skinOf = a => SKINS[Math.abs(Math.floor(a.homeX * 12.9898 + a.homeY * 78.233)) % SKINS.length];
