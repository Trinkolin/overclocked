// Headless check: a full day with no player input. Usage: node tools/sim.mjs [seed] [voxxy|droid|biggy|ai]
//   the robot the idle player steers (and never moves), or ai: the AI runs all three, nobody touches anything
import { Game } from '../src/game.js';
import { seed } from './rng.mjs';
seed(+(process.argv[2] || 1));
let res;
const g = new Game({ toast: m => console.log(`  [${g.clock.text}] ${m}`), roundOver: r => (res = r) });
const who = process.argv[3];
g.start(+(process.env.DAY || 0), who === 'ai' ? 'ai' : undefined); // DAY=0..4: Monday..Friday
if (who && who !== 'ai') g.active = who; // which robot the idle player 'holds'
const input = { x: 0, y: 0, hold: false, consumeHold() {} };
while (!g.over) g.update(1 / 60, input);
console.log(res);
