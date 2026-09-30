// Stress test: random player input for whole days; catches NaN, robots leaving the map,
// and the crowd emptying out.  Usage: node tools/stress.mjs [seeds]
import { Game } from '../src/game.js';
import { W, H } from '../src/level.js';
import { solidAt } from '../src/physics.js';
import { seed } from './rng.mjs';
const N = +(process.argv[2] || 3);
for (let s = 1; s <= N; s++) {
  seed(s * 7919);
  const g = new Game({ toast() {}, roundOver() {} });
  g.start();
  const input = { x: 0, y: 0, hold: false, consumeHold() { this.hold = false; } };
  let problem = null, minPop = Infinity, i = 0;
  const kinds = ['voxxy', 'droid', 'biggy'];
  while (!g.over && !problem) {
    if (i % 90 === 0) { input.x = Math.round(Math.random() * 2 - 1); input.y = Math.round(Math.random() * 2 - 1); input.hold = Math.random() < 0.3; const k = kinds[(Math.random() * 3) | 0]; if (!g.robots[k].rogue) g.active = k; }
    g.update(1 / 60, input); i++;
    for (const rb of g.robotList) {
      if (![rb.x, rb.y, rb.vx, rb.vy, rb.patience].every(Number.isFinite)) problem = `${rb.name} NaN at t=${g.t.toFixed(1)}`;
      else if (rb.x < 0 || rb.y < 0 || rb.x > W || rb.y > H) problem = `${rb.name} off map (${rb.x | 0},${rb.y | 0}) t=${g.t.toFixed(1)}`;
      else if (solidAt(g.wallGrid, rb.x, rb.y)) problem = `${rb.name} inside a wall (${rb.x | 0},${rb.y | 0}) t=${g.t.toFixed(1)}`;
    }
    const bad = g.crowd.list.find(a => !Number.isFinite(a.x) || !Number.isFinite(a.y));
    if (bad) problem = `agent NaN kind=${bad.kind} state=${bad.state} t=${g.t.toFixed(1)}`;
    if (!Number.isFinite(g.satisfaction)) problem = 'satisfaction NaN';
    if (g.t > 20) minPop = Math.min(minPop, g.crowd.list.length);
  }
  console.log(`seed ${s}: ${problem || 'ok'}  ended ${g.clock.text} (${g.result?.reason ?? 'running'})  min crowd ${minPop}`);
}
