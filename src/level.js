// Kinepolis Antwerp on two floors, both rotated 90° like the plans (the bottom of a plan is
// on the left): the cinema level (Devoxx rooms 3–10 and their corridor) on top, and below it
// the ground floor (main entrance, reception, BOF rooms, exhibition hall). The two floors sit
// one above the other in the same world; the staircases link them.
// Everything is aligned to the 10-unit nav grid. 1 unit ≈ 7 cm.

export const W = 1600, FLOOR_H = 840, H = FLOOR_H * 2, CELL = 10;
export const GW = W / CELL, GH = H / CELL;
export const GROUND = FLOOR_H; // y offset of the ground floor
export const floorOf = y => (y >= GROUND ? 0 : 1); // 1: cinema level, 0: ground floor
const G = ([x, y, w, h]) => [x, y + GROUND, w, h]; // a rect on the ground floor

// Destination hues (agents are tinted by where they are heading).
export const ROOM_HUES = { 3: '#ff6b6b', 4: '#4dd2e0', 5: '#ffb020', 6: '#b98cff', 7: '#7bdc6b', 8: '#ff8a3d', 9: '#5b8cff', 10: '#ff6bd0' };

// Room sizes measured on the Kinepolis plan: 5 and 8 are the widest and deepest, 3 and 10 the
// smallest, 4/9 and 6/7 in between (width along the corridor, depth away from it).
const SPANS = { 6: [120, 300], 5: [310, 560], 4: [570, 760], 3: [770, 930], 7: [120, 300], 8: [310, 560], 9: [570, 760], 10: [770, 930] };
const DEPTH = { 6: 200, 5: 240, 4: 200, 3: 160, 7: 210, 8: 250, 9: 210, 10: 170 };
// One door per room onto the corridor, as at Kinepolis, at one end of its wall: the doors of 8 and 9 side by side, 7's at the far
// end, 10's by the stairwell; the rooms across the corridor mirror them (6 like 7, 5 like 8, 4 like 9, 3 like 10)
const DOOR_AT_RIGHT = { 5: true, 8: true };

// The seats (drawn in render.js): raked rows 14 apart, from 40 in front of the screen back to the projection room, with a cross
// aisle halfway (row `cross`, at crossY). The entrances pass under the back rows: people come out onto the cross aisle
const crossRow = depth => Math.round(Math.floor((depth - 70) / 14) / 2);
export const rooms = Object.entries(SPANS).map(([n, [x0, x1]]) => {
  n = +n;
  const top = [3, 4, 5, 6].includes(n), depth = DEPTH[n];
  const [y0, y1] = top ? [320 - depth, 320] : [510, 510 + depth];
  const cx = Math.round((x0 + x1) / 20) * 10, cross = crossRow(depth), crossY = top ? y0 + 40 + cross * 14 : y1 - 40 - cross * 14;
  return {
    n, top, x0, x1, y0, y1, cx, depth, cross, crossY,
    // the door onto the corridor: double doors, wide enough for Biggy
    doors: [{ x: DOOR_AT_RIGHT[n] ? x1 - 50 : x0 + 10, y: top ? 320 : 500, w: 40, h: 10 }],
    // where people sit down: the front tier, between the flat floor in front of the screen and the cross aisle
    seats: top ? { x: x0 + 10, y: y0 + 32, w: x1 - x0 - 20, h: crossY - 6 - (y0 + 32) } : { x: x0 + 10, y: crossY + 6, w: x1 - x0 - 20, h: y1 - 32 - (crossY + 6) },
    label: `${n}`,
  };
});
export const roomByN = Object.fromEntries(rooms.map(r => [r.n, r]));

const walkable = [
  [70, 330, 1230, 170],   // the corridor, from the stairs at its far end past the Kinepolis rooms 2|11 and 1|12
  [1300, 290, 250, 250],  // the lounge at the end of the corridor, and the way on to the cinema entrance
  [70, 30, 1010, 40],     // service corridor (top): 40 wide, so Biggy fits too
  [70, 30, 40, 290],      // service passage down to the landing (in line with it, so Biggy can line up under the door)
  [70, 770, 1010, 40],    // service corridor (bottom)
  [70, 510, 40, 300],
  // ---- ground floor
  G([40, 170, 450, 420]),   // main entrance and reception
  G([490, 60, 990, 530]),   // the exhibition hall (its rounded corner is cut out in buildStatic)
  G([490, 590, 280, 70]),   // …its bottom edge steps up towards the polo pickup, as on the plan
  G([770, 590, 245, 30]),
  G([60, 600, 145, 220]),   // BOF room 1
  G([210, 600, 135, 220]),  // BOF room 2
  G([0, 190, 40, 380]),     // the main entrance: glass doors along the whole front
  G([355, 600, 90, 220]),   // toilets next to the BOF rooms ("Toilets >" on the plan)
  G([1490, 60, 100, 220]),  // toilets off the top corner of the hall ("< Toilet entrance" on the plan)
];

// Service doors and fire exits onto the service corridors: staff only (the robots and the cleaners), see closeService.
export const serviceDoorDefs = [
  { id: 'svc-landing-top', x: 70, y: 320, w: 40, h: 10, label: 'Service door' },
  { id: 'svc-landing-bot', x: 70, y: 500, w: 40, h: 10, label: 'Service door' },
  ...rooms.map(r => ({ id: `svc-room-${r.n}`, x: r.cx - 20, y: r.top ? 70 : r.y1, w: 40, h: r.top ? r.y0 - 70 : 770 - r.y1, label: `Room ${r.n} fire exit` })),
];

// Kinepolis rooms Devoxx doesn't program: closed
export const kinepolisRooms = [
  { n: 2, x0: 940, x1: 1080, y0: 80, y1: 320, top: true },
  { n: 1, x0: 1130, x1: 1290, y0: 80, y1: 320, top: true },
  { n: 11, x0: 940, x1: 1080, y0: 510, y1: 700, top: false },
  { n: 12, x0: 1130, x1: 1260, y0: 510, y1: 700, top: false },
  { n: 13, x0: 1290, x1: 1440, y0: 560, y1: 780, top: false },
  { n: 14, x0: 1450, x1: 1590, y0: 560, y1: 720, top: false },
];
// Past rooms 1|12 the corridor opens onto the Kinepolis lounge: the charging corner along the top,
// the coffee machine along the bottom. The floor carries on to the cinema's own entrance, which Devoxx doesn't use.
export const lounge = [1300, 290, 250, 250];
export const coffeeBar = [1310, 506, 80, 34];
// charging bases ⚡: the pads in the lounge upstairs, and downstairs in a corner of reception, by the main entrance and the
// stairs up, out of everyone's way
export const chargers = [
  { id: 'lounge', rect: [1325, 305, 170, 80] },
  { id: 'reception', rect: G([46, 176, 130, 58]) }, // three pads, like the lounge's
];
export const popcornMachine = [1410, 500, 40, 40]; // a red cinema popcorn cart, next to the coffee
// two sofas in the middle of the lounge, facing the coffee and popcorn machines (solid: nobody walks across them)
export const loungeSofas = [[1330, 400, 60, 10], [1420, 400, 60, 10]];
export const stairs = [70, 360, 40, 110]; // clear of the two service doors above and below it
// Staircases are real flights: you walk up (or down) every step, between two railings, and only at the top do you change floors.
// Upstairs, the two stairwells down to the exhibition hall, against the corridor's walls between rooms 3 and 4 and between
// rooms 9 and 10, beside the doors of 3 and 10: step in, and you are at the top of the hall's flight
export const sideStairs = [[750, 330, 30, 30], [750, 470, 30, 30]];
export const hallStairwells = sideStairs;
// the railings around the stairs upstairs (solid): along both sides of the wide stairs from reception, and around each stairwell
// on its corridor side and at its far end (by the door of room 3 or 10), so that you step in at its top end
export const landingRails = [[70, 360, 40, 10], [70, 460, 40, 10], [750, 360, 30, 10], [770, 330, 10, 30], [750, 460, 30, 10], [770, 470, 10, 30]];
// the foyer's dark pillars down the middle of the corridor, under their white fabric sails (the Kinepolis photos), clear of the
// stairwells' sign; each stands on one nav cell
export const corridorPillars = [200, 340, 480, 610, 910, 1040, 1170].map(x => [x - 5, 410, 10, 10]);
// the stairwells between Kinepolis rooms 2|1 and 11|12 (staff, drawn only)
export const stairwells = [[1085, 240, 40, 60], [1085, 530, 40, 60]];
// the long black standing tables with a little plant, where people chat between talks (venue photos):
// a few along the corridor, clear of its middle lane, the room doors and the stairs.
// Each is 30 × 10 units (about 2.1 × 0.7 m), long side along the corridor.
export const TABLE_W = 30, TABLE_H = 10;
// where attendees sit down or stand chatting and block the way: the stairs and the main entrance (security asks them to move)
export const exitSpots = [
  { x: 150, y: 415, where: 'on the stairs to reception' },
  { x: 740, y: 345, where: 'on the stairs to the hall' },
  { x: 740, y: 485, where: 'on the stairs to the hall' },
  { x: 118, y: 380 + 840, where: 'at the foot of the stairs' },
  { x: 1350, y: 220 + 840, where: 'on the stairs to the rooms' },
  { x: 1350, y: 400 + 840, where: 'on the stairs to the rooms' },
  { x: 70, y: 380 + 840, where: 'in the main entrance' },
];
export const tables = [[225, 370], [410, 450], [670, 370], [1150, 450]]; // along the walls, clear of the doors

// ---- ground floor
// the flights downstairs: lane (where you walk, from its bottom end up to its top end), top (the top step, where you change floors)
// and rails (the railings and the wall at the top end, solid)
const flight = (lane, top, rails) => ({ lane: G(lane), top: G(top), rails: rails.map(G) });
// "^ Rooms ^": the wide, majestic stairs up from reception, facing the main entrance and climbing away from it; the reception
// desk is under their top (as at Kinepolis); centred on the main entrance
export const receptionFlight = flight([130, 320, 90, 120], [200, 320, 20, 120], [[130, 310, 100, 10], [130, 440, 100, 10], [220, 320, 10, 120]]);
export const receptionStairs = receptionFlight.top;
// the reception desk: under the top of the wide stairs, and out past them on the hall side, where it can be seen (and where its
// counter is solid: people walk round it)
export const receptionDesk = G([170, 353, 110, 54]);
export const receptionCounter = G([230, 353, 50, 54]);
// the two "stairs to cinema rooms" in the hall: you step on at the right end (the far end of the hall) and climb to the left
export const hallFlightDefs = [
  flight([1250, 210, 80, 30], [1250, 210, 20, 30], [[1240, 200, 90, 10], [1240, 240, 90, 10], [1240, 210, 10, 30]]),
  flight([1250, 390, 80, 30], [1250, 390, 20, 30], [[1240, 380, 90, 10], [1240, 420, 90, 10], [1240, 390, 10, 30]]),
];
export const hallStairs = hallFlightDefs.map(f => f.top);
export const hallFlights = hallFlightDefs.map(f => f.lane);
export const poloDesk = G([880, 580, 140, 40]); // the Devoxx polo pickup: a long white counter against the bottom of the hall, where the plan has it
// the hall's white pillars (the Kinepolis "Hollywood" hall): a grid along its aisles, one every 100 units (7 m) where there is
// room around the booths, the coffee and the stairs; each stands on one nav cell (drawn a little wider, about 1 m)
const pillarRow = (y, xs) => xs.map(x => G([x - 5, y - 5, 10, 10]));
export const hallPillars = [
  ...pillarRow(215, [640, 740, 840, 940, 1040, 1140, 1420]),
  ...pillarRow(335, [740, 940, 1140, 1420]),
  ...pillarRow(445, [640, 740, 840, 940, 1040, 1140, 1420]),
];
export const hallCoffee = G([985, 300, 110, 50]); // the coffee station in the exhibition hall, between the booths and the stairs
export const bofRooms = [{ n: 1, rect: G([60, 600, 145, 220]) }, { n: 2, rect: G([210, 600, 135, 220]) }];
// the sponsors' booths: the hall is full of them, with aisles kept clear around the coffee, the stairs, the toilets and the polo pickup
// (back: against the hall's bottom wall, under booth D, so its breaker is on the aisle side)
export const booths = [
  { id: 'A', rect: G([580, 110, 120, 70]) }, { id: 'B', rect: G([780, 110, 120, 70]) }, { id: 'C', rect: G([980, 110, 120, 70]) },
  { id: 'D', rect: G([580, 480, 120, 70]) }, { id: 'E', rect: G([580, 590, 120, 70]), back: true }, { id: 'F', rect: G([1180, 470, 120, 70]) },
  { id: 'G', rect: G([580, 250, 120, 60]) }, { id: 'H', rect: G([780, 250, 120, 60]) }, { id: 'I', rect: G([580, 360, 120, 60]) },
  { id: 'J', rect: G([780, 360, 120, 60]) }, { id: 'K', rect: G([1180, 110, 120, 60]) }, { id: 'L', rect: G([1000, 480, 120, 70]) },
];
export const mainEntrance = G([0, 190, 40, 380]);
// the two toilet blocks from the plan, and their doors (reception side / hall side); sides: the women's (F) and the men's (M)
// stalls: how many people each side takes at once, at the scale of the people on the map (a sample of the ~3,500 at Devoxx:
// a few stalls for them are the whole block for everyone; the men's are quicker, with urinals); queue: where its line starts, outside
// the door, and which way it grows (people wait there when every stall is taken): along the wall, clear of the doorway, so
// that people coming out don't walk into it
export const toilets = [
  { id: 'reception', rect: G([355, 600, 90, 220]), door: G([375, 590, 40, 10]), sides: ['F', 'M'], stalls: { F: 2, M: 2 }, // both, side by side
    queue: { F: { x: 370, y: 582 + GROUND, dx: -9, dy: 0 }, M: { x: 420, y: 582 + GROUND, dx: 9, dy: 0 } } },
  { id: 'hall', rect: G([1490, 60, 100, 220]), door: G([1480, 90, 10, 40]), sides: ['F', 'M'], stalls: { F: 2, M: 2 },
    queue: { F: { x: 1470, y: 164 + GROUND, dx: -9, dy: 0 }, M: { x: 1470, y: 146 + GROUND, dx: -9, dy: 0 } } }, // below the door: the stairs are above it
  // upstairs: the two rounded toilet kiosks jutting into the corridor under Kinepolis rooms 2 and 1, the men's and the women's
  { id: 'room 2', rect: [960, 330, 100, 40], door: [990, 370, 40, 10], kiosk: [950, 330, 120, 50], sides: ['M'], stalls: { M: 2 },
    queue: { M: { x: 1036, y: 388, dx: 9, dy: 0 } } },
  { id: 'room 1', rect: [1110, 330, 100, 40], door: [1140, 370, 40, 10], kiosk: [1100, 330, 120, 50], sides: ['F'], stalls: { F: 2 },
    queue: { F: { x: 1186, y: 388, dx: 9, dy: 0 } } },
];
// the wheelchair ramp between reception and the hall (drawn only: everyone can use it)
export const ramp = G([490, 430, 60, 150]);
// the few steps down from reception into the hall, along its left side (drawn only)
export const hallSteps = G([496, 190, 50, 240]);
// Staircases link the floors: walk onto one end and you come out at the other.
export const portals = [
  // a: the top step upstairs, b: the top step downstairs; outA / outB: where you come out, just past the top step, on the
  // landing upstairs or on the flight downstairs (then down it)
  { name: 'stairs', a: stairs, b: receptionStairs, outA: [135, 415], outB: [186, 380 + GROUND] },
  { name: 'stairs to the exhibition hall', a: sideStairs[0], b: hallStairs[0], outA: [738, 348], outB: [1284, 225 + GROUND] },
  { name: 'stairs to the exhibition hall', a: sideStairs[1], b: hallStairs[1], outA: [738, 482], outB: [1284, 405 + GROUND] },
];

export const targetsDef = {
  coffee: [[1305, 460, 100, 40]],
  charger: [[1325, 305, 170, 80], G([51, 181, 120, 48])], // the charging bases: where a worn-out robot heads
  // the attendees' ways down and up, on their own walls (the service corridors are closed to them; the robots' stairs fields
  // below go through them), and their way down to reception (to sit on its steps)
  down: [stairs, ...sideStairs],
  up: [receptionStairs, ...hallStairs],
  downReception: [stairs],
  // the attendees go to the women's or the men's (the robots, to any toilets): the kiosks upstairs, one side of each block downstairs
  // the head of each line outside the women's and the men's doors (see toilets)
  'wc:F': toilets.filter(t => t.sides.includes('F')).map(t => [t.queue.F.x - 5, t.queue.F.y - 5, 10, 10]),
  'wc:M': toilets.filter(t => t.sides.includes('M')).map(t => [t.queue.M.x - 5, t.queue.M.y - 5, 10, 10]),
  tables: tables.map(([x, y]) => [x - 10, y - 10, TABLE_W + 20, TABLE_H + 20]), // standing around a table
  // the hallway track, downstairs: in front of the booths (the top row faces down, the bottom row up), and around the hall's coffee
  expo: booths.map(({ rect: [x, y, w, h] }) => y < GROUND + 300 ? [x + 10, y + h + 4, w - 20, 14] : [x + 10, y - 18, w - 20, 14]),
  // sitting on the wide stairs at reception, on the lower steps along both railings (the middle stays clear for those going up)
  steps: [G([140, 320, 50, 10]), G([140, 430, 50, 10])],
  polo: [G([890, 564, 120, 12])], // at the polo pickup's counter, open from the morning
  hallcoffee: [[hallCoffee[0] - 5, hallCoffee[1] - 14, hallCoffee[2] + 10, 12], [hallCoffee[0] - 5, hallCoffee[1] + hallCoffee[3] + 2, hallCoffee[2] + 10, 14]],
  stairsUp: [receptionStairs, ...hallStairs],  // from the ground floor, the way up
  stairsDown: [stairs, ...sideStairs], // from the cinema level, the way down
};

// ---------------------------------------------------------------- grids
export const idx = (cx, cy) => cy * GW + cx;

function fillRect(grid, [x, y, w, h], v) { // snapped to the grid: an off-grid rect must never shift its cells
  for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++)
    for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) grid[idx(cx, cy)] = v;
}
export function rectCells([x, y, w, h]) {
  const out = [];
  for (let cy = Math.floor(y / CELL); cy < Math.ceil((y + h) / CELL); cy++)
    for (let cx = Math.floor(x / CELL); cx < Math.ceil((x + w) / CELL); cx++) out.push(idx(cx, cy));
  return out;
}

export function buildStatic() {
  const g = new Uint8Array(GW * GH).fill(1);
  walkable.forEach(r => fillRect(g, r, 0));
  for (const r of rooms) {
    fillRect(g, [r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0], 0);
    r.doors.forEach(d => fillRect(g, [d.x, d.y, d.w, d.h], 0));
    // just inside, the gap between the door and the side wall is filled in: in a crowd, people got pinned in that corner
    r.doors.forEach(d => fillRect(g, [d.x === r.x0 + 10 ? r.x0 : d.x + d.w, r.top ? r.y1 - 10 : r.y0, 10, 10], 1));
  }
  serviceDoorDefs.forEach(d => fillRect(g, [d.x, d.y, d.w, d.h], 0));
  fillRect(g, coffeeBar, 1);
  fillRect(g, popcornMachine, 1);
  tables.forEach(([x, y]) => fillRect(g, [x, y, TABLE_W, TABLE_H], 1));
  corridorPillars.forEach(r => fillRect(g, r, 1));
  // ground floor
  for (const b of bofRooms) fillRect(g, [b.rect[0] + 55, b.rect[1] - 30, 40, 30], 0); // BOF doors onto reception
  toilets.forEach(t => { if (t.kiosk) { fillRect(g, t.kiosk, 1); fillRect(g, t.rect, 0); } fillRect(g, t.door, 0); });
  [receptionFlight, ...hallFlightDefs].forEach(f => f.rails.forEach(r => fillRect(g, r, 1))); // the flights: only their railings stop you
  landingRails.forEach(r => fillRect(g, r, 1));
  fillRect(g, receptionCounter, 1);
  loungeSofas.forEach(r => fillRect(g, r, 1));
  // the hall's rounded top-left corner (the curved wall on the plan)
  for (let cy = Math.floor((GROUND + 60) / CELL); cy < (GROUND + 170) / CELL; cy++)
    for (let cx = 49; cx < 60; cx++) if (Math.hypot(cx * CELL + 5 - 600, cy * CELL + 5 - (GROUND + 170)) > 110) g[idx(cx, cy)] = 1;
  fillRect(g, poloDesk, 1);
  hallPillars.forEach(r => fillRect(g, r, 1));
  fillRect(g, hallCoffee, 1);
  booths.forEach(b => fillRect(g, b.rect, 1));
  return g;
}

// the attendees' walls: the service doors and fire exits are closed to them, so the service corridors are staff only
export function closeService(grid) {
  serviceDoorDefs.forEach(d => fillRect(grid, [d.x, d.y, d.w, d.h], 1));
  return grid;
}

export function targetCells(key, staticGrid) {
  let rects;
  if (key.startsWith('room:')) { const s = roomByN[+key.slice(5)].seats; rects = [[s.x, s.y, s.w, s.h]]; }
  else rects = targetsDef[key];
  const set = new Set();
  rects.forEach(r => rectCells(r).forEach(c => { if (!staticGrid[c]) set.add(c); }));
  return Int32Array.from(set);
}

// seats per room, from the Kinepolis plan: people pick a talk in proportion
export const SEATS = { 3: 345, 4: 364, 5: 684, 6: 408, 7: 407, 8: 746, 9: 426, 10: 304 };

