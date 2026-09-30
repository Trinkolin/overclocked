// Refresh src/talks.js from the public Devoxx Belgium 2026 schedule: node tools/talks.mjs
// Titles only, no speaker names. The schedule doesn't say which room yet ("TBA n"), so the rooms are the game's choice:
// every keynote goes to the big Room 8 (where the crowd heads), and the evening BOFs go to the BOF rooms downstairs.
import { writeFileSync } from 'node:fs';

const API = 'https://dvbe26.cfp.dev/api/public/schedules';
const ROOM = { 'TBA 7': 8, 'TBA 2': 5, 'TBA 3': 4, 'TBA 4': 9, 'TBA 5': 3, 'TBA 6': 10, 'TBA 8': 6, 'TBA 9': 7, 'TBA 10': 'bof1', 'TBA 11': 'bof2' };
const hm = iso => { const d = new Date(iso); return `${String((d.getUTCHours() + 2) % 24).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }; // CEST

const days = [];
for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
  const S = await (await fetch(`${API}/${day}`)).json();
  days.push(S.filter(s => s.proposal?.title && ROOM[s.room?.name] !== undefined && !/^À déterminer/.test(s.proposal.title))
    .map(s => [/Keynote/.test(s.sessionType.name) ? 8 : ROOM[s.room.name], hm(s.fromDate), hm(s.toDate), s.sessionType.name, s.proposal.title.replace(/\s+/g, ' ').trim()])
    .sort((a, b) => a[1].localeCompare(b[1]) || String(a[0]).localeCompare(String(b[0]))));
}
const today = new Date().toISOString().slice(0, 10);
writeFileSync(new URL('../src/talks.js', import.meta.url), `// The real talks of Devoxx Belgium 2026, from the public schedule (dvbe26.cfp.dev/api/public/schedules), fetched on ${today}.
// Titles only: no speaker names. The schedule doesn't say which room yet ("TBA"), so the rooms here are the game's own choice.
// Per day (Monday..Friday): [room, from, to, type, title]; room is a Devoxx room number (3–10) or 'bof1' / 'bof2' downstairs.
// Refresh with: node tools/talks.mjs
export const TALKS = [
${days.map(d => `  [\n${d.map(t => `    ${JSON.stringify(t)},`).join('\n')}\n  ],`).join('\n')}
];
`);
console.log(days.map((d, i) => `day ${i}: ${d.length} talks`).join(' · '));
