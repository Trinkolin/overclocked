// All sound is synthesised with WebAudio: no audio files.
let ctx = null, master = null, noiseBuf = null;
let muted = false, lastServo = -1, lastPatter = -1;
let demo = false, ui = false; // the title screen's demo plays silently; only the menu's own clicks are heard

function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function env(node, t, a, peak, dcy) {
  node.gain.setValueAtTime(0.0001, t);
  node.gain.exponentialRampToValueAtTime(peak, t + a);
  node.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
}

function osc(type, f0, f1, dur, vol, when = 0) {
  if (!ctx || muted || (demo && !ui)) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, 0.005, vol, dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function burst(freq, q, dur, vol, when = 0) {
  if (!ctx || muted || (demo && !ui)) return;
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = noise();
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.004, vol, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

export const audio = {
  init() {
    if (ctx) { ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    // (no background murmur: filtered noise sounded like hiss, not a crowd)
  },
  toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; return muted; },
  get muted() { return muted; },
  thud(power = 0.5, f = 70) { osc('sine', f * 1.6, f * 0.6, 0.18 + power * 0.2, 0.25 + power * 0.5); burst(180, 1, 0.08, 0.1 * power); },
  // each robot's own sound as it moves (only the one you steer is heard): Voxxy's quick light steps, Droid's joints, Biggy's heavy tread
  patter() { if (!ctx || ctx.currentTime - lastPatter < 0.11) return; lastPatter = ctx.currentTime; osc('triangle', 1250, 900, 0.035, 0.06); burst(3200, 5, 0.02, 0.06); },
  servo() { if (!ctx || ctx.currentTime - lastServo < 0.25) return; lastServo = ctx.currentTime; osc('sawtooth', 380, 520, 0.12, 0.05); },
  stomp(power = 0.5) { osc('sine', 95, 45, 0.1, 0.08 + power * 0.15); burst(260, 0.9, 0.1, 0.5 * power); burst(1100, 3, 0.025, 0.12 * power); }, // a thud with grit: steps, not a heartbeat
  tick() { ui = true; burst(2400, 4, 0.03, 0.08); ui = false; },
  setDemo(on) { demo = on; },
  chirp() { osc('square', 880, 1760, 0.07, 0.05); osc('square', 1320, 2200, 0.08, 0.04, 0.09); },
  chime() { [880, 1108, 1318].forEach((f, i) => osc('triangle', f, 0, 0.5, 0.08, i * 0.08)); },
  clunk() { burst(600, 2, 0.12, 0.35); osc('square', 90, 50, 0.1, 0.08); },
  gong() { [196, 294, 392].forEach((f, i) => osc('sine', f, f * 0.99, 2.2, 0.12 / (i + 1))); },
  // footsteps on a flight of stairs: rising going up, falling going down
  stairs(up) { for (let i = 0; i < 6; i++) { const k = up ? i : 5 - i; osc('triangle', 300 + k * 60, 0, 0.05, 0.05, i * 0.1); burst(1400 + k * 200, 3, 0.03, 0.05, i * 0.1); } },
  ding() { osc('sine', 1046, 0, 0.9, 0.12); osc('sine', 784, 0, 1.1, 0.1, 0.25); },
};
