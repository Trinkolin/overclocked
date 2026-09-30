// Flow fields: one Dijkstra distance field per destination, recomputed
// round-robin every frame with a density penalty so the crowd re-routes
// around jams. The robots find their way with the same fields.
import { GW, GH, CELL } from './level.js';

const N = GW * GH;
const OX = Int32Array.of(1, -1, 0, 0, 1, 1, -1, -1);
const OY = Int32Array.of(0, 0, 1, -1, 1, -1, 1, -1);
const WT = Float32Array.of(1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2);
const BIG = 1e9;

class Heap {
  constructor(n) { this.k = new Float32Array(n * 8); this.v = new Int32Array(n * 8); this.n = 0; }
  push(key, val) {
    let i = this.n++;
    const k = this.k, v = this.v;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], n = --this.n;
    const key = k[n], val = v[n];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && k[c + 1] < k[c]) c++;
      if (k[c] >= key) break;
      k[i] = k[c]; v[i] = v[c]; i = c;
    }
    k[i] = key; v[i] = val;
    return top;
  }
}
const heap = new Heap(N);

export class FlowField {
  constructor(key, targets) {
    this.key = key;
    this.isTarget = new Uint8Array(N);
    this.setTargets(targets);
    this.dist = new Float32Array(N);
    this.dx = new Float32Array(N);
    this.dy = new Float32Array(N);
  }

  setTargets(targets) {
    this.targets = targets;
    this.isTarget.fill(0);
    targets.forEach(c => (this.isTarget[c] = 1));
  }

  compute(solid, cost) {
    const d = this.dist, dxA = this.dx, dyA = this.dy;
    d.fill(BIG);
    heap.n = 0;
    for (const c of this.targets) if (!solid[c]) { d[c] = 0; heap.push(0, c); }
    const hk = heap.k;
    while (heap.n) {
      const kd = hk[0];
      const c = heap.pop();
      if (kd > d[c]) continue;
      const cx = c % GW, cy = (c / GW) | 0;
      for (let k = 0; k < 8; k++) {
        const ox = OX[k], oy = OY[k];
        const nx = cx + ox, ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const nc = ny * GW + nx;
        if (solid[nc]) continue;
        if (k >= 4 && (solid[cy * GW + nx] || solid[ny * GW + cx])) continue;
        const nd = kd + WT[k] * cost[nc];
        if (nd < d[nc]) { d[nc] = nd; heap.push(nd, nc); }
      }
    }
    // steepest-descent direction per cell
    for (let c = 0; c < N; c++) {
      dxA[c] = 0; dyA[c] = 0;
      const dc = d[c];
      if (solid[c] || dc >= BIG || dc === 0) continue;
      const cx = c % GW, cy = (c / GW) | 0;
      let best = dc, bx = 0, by = 0;
      for (let k = 0; k < 8; k++) {
        const nx = cx + OX[k], ny = cy + OY[k];
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const nc = ny * GW + nx;
        if (solid[nc] || d[nc] >= best) continue;
        if (k >= 4 && (solid[cy * GW + nx] || solid[ny * GW + cx])) continue;
        best = d[nc]; bx = OX[k] / WT[k]; by = OY[k] / WT[k];
      }
      dxA[c] = bx; dyA[c] = by;
    }
  }

  // bilinear blend of neighbouring cell directions → smooth steering
  sample(x, y, out) {
    const fx = x / CELL - 0.5, fy = y / CELL - 0.5;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0;
    let sx = 0, sy = 0;
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= 1; i++) {
      const cx = x0 + i, cy = y0 + j;
      if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) continue;
      const c = cy * GW + cx;
      const wgt = (i ? tx : 1 - tx) * (j ? ty : 1 - ty);
      sx += this.dx[c] * wgt; sy += this.dy[c] * wgt;
    }
    const l = Math.hypot(sx, sy);
    if (l < 1e-4) {
      const c = Math.floor(y / CELL) * GW + Math.floor(x / CELL);
      out.x = this.dx[c] || 0; out.y = this.dy[c] || 0;
    } else { out.x = sx / l; out.y = sy / l; }
    return out;
  }

  distAt(x, y) { return this.dist[Math.floor(y / CELL) * GW + Math.floor(x / CELL)]; }
}
