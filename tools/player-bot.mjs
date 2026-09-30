// A scripted "reasonable first-time player": can a judge who gets the idea finish the day?
// Usage: node tools/player-bot.mjs [seeds=8] [threshold=45] [reaction=0.6] [comfort|nearest|lounge] [restTo=80]
//   comfort: send the nearest friend to stay with a stressed robot (hold E)
//   nearest / lounge: walk the tired robot itself to the nearest charging base / to the lounge's
//   threshold: energy below which the player looks after a robot
//   reaction:  seconds between the player's decisions (a human isn't instant)
import { Game, LOUNGE } from '../src/game.js';
import { GW, CELL } from '../src/level.js';
import { seed } from './rng.mjs';

const SEEDS = +(process.argv[2] || 8), THRESH = +(process.argv[3] || 45), REACT = +(process.argv[4] || 0.6);
const CARE = process.argv[5] || 'comfort', REST_TO = +(process.argv[6] || 80); // where to rest, and until what calm
const lounge = { x: LOUNGE[0] + LOUNGE[2] / 2, y: LOUNGE[1] + LOUNGE[3] / 2 };

function play(s) {
  seed(s);
  let res;
  const g = new Game({ toast() {}, roundOver: r => (res = r) });
  g.start(+(process.env.DAY || 0)); // DAY=0..4: Monday..Friday
  const input = { x: 0, y: 0, hold: false, consumeHold() { this.hold = false; } };
  let plan = null, think = 0;
  const minCalm = { voxxy: 100, droid: 100, biggy: 100 };

  const decide = () => {
    const L = g.robotList;
    // 1. an overwhelmed friend: the nearest calm robot goes to stay with it
    const down = L.find(r => r.rogue);
    if (down) {
      const helper = L.filter(r => !r.rogue).sort((a, b) => Math.hypot(a.x - down.x, a.y - down.y) - Math.hypot(b.x - down.x, b.y - down.y))[0];
      if (helper) return { kind: helper.kind, to: down, hold: true };
    }
    // 2. keep comforting / resting the same robot until it is calm again
    if (plan?.comfort && !plan.to.rogue && plan.to.patience < REST_TO && !g.robots[plan.kind].rogue) return plan;
    if (plan?.rest && !g.robots[plan.kind].rogue && g.robots[plan.kind].patience < REST_TO) return plan;
    // 3. the most tired robot: a friend comes to stay with it, or it goes to a charging base
    const low = L.filter(r => !r.rogue && r.patience < THRESH).sort((a, b) => a.patience - b.patience)[0];
    if (low && CARE === 'comfort') {
      const friend = L.filter(r => r !== low && !r.rogue).sort((a, b) => Math.hypot(a.x - low.x, a.y - low.y) - Math.hypot(b.x - low.x, b.y - low.y))[0];
      if (friend) return { kind: friend.kind, to: low, hold: true, comfort: true };
    }
    if (low) return { kind: low.kind, to: CARE === 'lounge' ? lounge : null, rest: true };
    return null; // everyone is fine: let the autopilots work
  };

  while (!g.over) {
    if ((think -= 1 / 60) <= 0) { think = REACT; plan = decide(); if (plan) g.select(plan.kind); }
    input.x = input.y = 0; input.hold = false;
    if (!plan) { // nothing urgent: do the selected robot's job by hand
      const rb = g.robots[g.active];
      if (!rb.rogue) { const v = g.clear(rb, g.autoInput(rb)); input.x = v.x; input.y = v.y; if (rb.kind === 'voxxy' && !v.x && !v.y) input.hold = true; }
    } else if (g.active === plan.kind) {
      const rb = g.robots[plan.kind];
      if (!plan.to) { // the nearest charging base
        const c = Math.floor(rb.y / CELL) * GW + Math.floor(rb.x / CELL);
        const base = g.chargerField(rb);
        if (!base.isTarget[c]) { const v = g.clear(rb, base.sample(rb.x, rb.y, {})); input.x = v.x; input.y = v.y; }
      } else {
        const d = Math.hypot(plan.to.x - rb.x, plan.to.y - rb.y);
        if (d > (plan.hold ? 18 : 25)) { const v = g.clear(rb, g.pathTo(rb, plan.to.x, plan.to.y)); input.x = v.x; input.y = v.y; }
        input.hold = !!plan.hold && d < 40;
      }
    }
    g.update(1 / 60, input);
    for (const r of g.robotList) minCalm[r.kind] = Math.min(minCalm[r.kind], r.patience);
  }
  return { ...res, minCalm };
}

const rows = [];
for (let s = 1; s <= SEEDS; s++) {
  const r = play(s);
  rows.push(r);
  console.log(`seed ${s}: ${r.reason.padEnd(6)} ${r.time}  sat ${String(r.satisfaction).padStart(3)}%  ${'★'.repeat(r.stars).padEnd(3)}  delivered ${r.delivered} fixed ${r.fixed} shooed ${r.shooed} bumps ${r.bumps} worn out ${r.revolts}  alone ${(r.alone || []).map(a => a.name + ' ' + a.low + '@' + a.clock).join(', ') || '-'}`);
}
const won = rows.filter(r => r.reason === 'day');
console.log(`\nthreshold ${THRESH}, reaction ${REACT}s: won ${won.length}/${SEEDS}, avg stars ${(rows.reduce((a, r) => a + r.stars, 0) / SEEDS).toFixed(1)}`);
