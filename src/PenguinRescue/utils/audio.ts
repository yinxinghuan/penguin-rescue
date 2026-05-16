// Lightweight Web Audio engine: procedural SFX (no asset bytes) + procedural BGM swell.
// Procedural keeps the bundle small and avoids licensing concerns. Calls are no-op
// before the first user gesture (browsers require interaction).

type SfxKey =
  | 'chirp_short' | 'chirp_help' | 'chirp_happy'
  | 'skua_cry'    | 'bonk'       | 'game_over';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bgmGain: GainNode | null = null;
let bgmTimer: number | null = null;
let bgmWanderId: number | null = null;
let bgmNodes: AudioNode[] = [];

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') await c.resume();
}

// ---------- helpers ----------
function envelope(node: GainNode, peak: number, attack: number, decay: number, t0: number) {
  node.gain.setValueAtTime(0, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone(freq: number, type: OscillatorType, dur: number, peak: number, t0: number, glideTo?: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
  envelope(g, peak, 0.01, dur, t0);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, peak: number, t0: number, lp = 2000) {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lp;
  const g = ctx.createGain();
  envelope(g, peak, 0.005, dur, t0);
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// ---------- SFX ----------
export function playSfx(key: SfxKey) {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume();
  const t = c.currentTime;
  switch (key) {
    case 'chirp_short':
      tone(1600, 'square', 0.08, 0.18, t, 1300);
      tone(2100, 'square', 0.06, 0.10, t + 0.02, 1700);
      break;
    case 'chirp_help':
      tone(900, 'sawtooth', 0.18, 0.16, t, 600);
      tone(1100, 'triangle', 0.16, 0.10, t + 0.06, 750);
      break;
    case 'chirp_happy':
      tone(1400, 'square', 0.08, 0.16, t, 1900);
      tone(1900, 'square', 0.08, 0.16, t + 0.10, 2300);
      break;
    case 'skua_cry':
      // Skua shriek: aggressive descending caw with a sharp top note
      tone(1800, 'square', 0.08, 0.18, t,        1400);
      tone(1400, 'square', 0.18, 0.22, t + 0.06,  800);
      tone( 900, 'sawtooth', 0.14, 0.16, t + 0.18, 600);
      noise(0.20, 0.05, t + 0.02, 4000);
      break;
    case 'bonk':
      tone(140, 'sine', 0.22, 0.35, t, 50);
      noise(0.18, 0.20, t, 1500);
      break;
    case 'game_over':
      // Descending arpeggio
      tone(660, 'triangle', 0.30, 0.22, t,          440);
      tone(440, 'triangle', 0.30, 0.22, t + 0.20,   330);
      tone(330, 'triangle', 0.45, 0.22, t + 0.40,   180);
      break;
  }
}

// ---------- BGM (swell pattern per project rule) ----------
//   rise 5-8s → hold 8-16s → fall 6-10s → silence 7-16s (looped)
// Procedural drone: two slightly detuned sawtooths through a bandpass that wanders.
export function startBgm(volume = 0.07) {
  const c = ensureCtx();
  if (!c || !master) return;
  if (c.state === 'suspended') c.resume();
  stopBgm();

  bgmGain = c.createGain();
  bgmGain.gain.value = 0;
  bgmGain.connect(master);

  const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 110;
  const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 110 * 1.005;
  const o3 = c.createOscillator(); o3.type = 'sine';     o3.frequency.value = 220;
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = 600;
  filt.Q.value = 1.4;
  o1.connect(filt); o2.connect(filt); o3.connect(filt);
  filt.connect(bgmGain);
  o1.start(); o2.start(); o3.start();
  bgmNodes = [o1, o2, o3, filt];

  let phase = 0;
  bgmWanderId = window.setInterval(() => {
    if (!ctx) return;
    phase += 0.6;
    filt.frequency.linearRampToValueAtTime(450 + Math.sin(phase) * 250, ctx.currentTime + 1);
  }, 1000);

  const schedule = () => {
    if (!ctx || !bgmGain) return;
    const rise = 5 + Math.random() * 3;
    const hold = 8 + Math.random() * 8;
    const fall = 6 + Math.random() * 4;
    const silence = 7 + Math.random() * 9;
    const now = ctx.currentTime;
    const peak = volume * (0.7 + Math.random() * 0.3);
    bgmGain.gain.cancelScheduledValues(now);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
    bgmGain.gain.linearRampToValueAtTime(peak, now + rise);
    bgmGain.gain.linearRampToValueAtTime(peak, now + rise + hold);
    bgmGain.gain.linearRampToValueAtTime(0,    now + rise + hold + fall);
    bgmTimer = window.setTimeout(schedule, (rise + hold + fall + silence) * 1000) as unknown as number;
  };
  schedule();
}

export function stopBgm() {
  if (bgmTimer !== null) { window.clearTimeout(bgmTimer); bgmTimer = null; }
  if (bgmWanderId !== null) { window.clearInterval(bgmWanderId); bgmWanderId = null; }
  if (bgmGain && ctx) {
    bgmGain.gain.cancelScheduledValues(ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    const g = bgmGain;
    const nodes = bgmNodes.slice();
    setTimeout(() => {
      g.disconnect();
      for (const n of nodes) {
        try { (n as any).stop?.(); } catch { /* not all nodes have stop */ }
        n.disconnect();
      }
    }, 800);
    bgmGain = null;
    bgmNodes = [];
  }
}
