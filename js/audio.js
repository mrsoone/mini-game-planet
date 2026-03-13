// MiniGamePlanet — Shared Web Audio Sound Engine
// Layered procedural synthesis. No external audio files.

const SOUND_STORAGE_KEY = 'mgp-sound-enabled';

function readStoredEnabled() {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored == null ? true : stored === 'true';
  } catch {
    return true;
  }
}

let ctx = null;
let masterGain = null;
let muted = !readStoredEnabled();
let volume = 0.3;
let bgOsc = null;
let bgInterval = null;
let lastScoreUpTime = 0;
let scoreUpCombo = 0;
let tensionOsc = null;
let tensionGain = null;

function persistEnabled() {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(!muted));
  } catch {}
}

function syncMasterGain() {
  if (masterGain && ctx) {
    masterGain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
  }
}

// ── Init / State ──

export function initAudio() {
  if (ctx) {
    syncMasterGain();
    if (ctx.state === 'suspended') ctx.resume();
    return Promise.resolve(ctx);
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(ctx.destination);
    return Promise.resolve(ctx);
  } catch (e) {
    ctx = null;
    return Promise.reject(e);
  }
}

export function hasAudio() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  syncMasterGain();
}

export function muteAll(forceMuted) {
  muted = typeof forceMuted === 'boolean' ? forceMuted : !muted;
  persistEnabled();
  if (!muted && !ctx) initAudio().catch(() => {});
  syncMasterGain();
  return muted;
}

export function isMuted() {
  return muted;
}

export function toggle(on) {
  const enabled = typeof on === 'boolean' ? on : muted;
  muteAll(!enabled);
  return !muted;
}

export function isEnabled() {
  return !muted;
}

// ── Internals ──

function ensureCtx() {
  if (muted) return false;
  if (!ctx) {
    initAudio().catch(() => {});
    if (!ctx) return false;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function now() { return ctx.currentTime; }

function gain(v = 0.3) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(v, now());
  g.connect(masterGain);
  return g;
}

function osc(type, freq, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, now());
  if (detune) o.detune.setValueAtTime(detune, now());
  return o;
}

function randDetune() {
  return (Math.random() - 0.5) * 10;
}

function noiseBuffer(duration) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function playNoiseBurst(duration, vol, filterFreq, filterType = 'lowpass') {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(duration + 0.05);
  const filt = ctx.createBiquadFilter();
  filt.type = filterType;
  filt.frequency.setValueAtTime(filterFreq, now());
  const g = gain(0);
  src.connect(filt);
  filt.connect(g);
  const t = now();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.start(t);
  src.stop(t + duration + 0.05);
  return { src, filter: filt, gain: g };
}

function envelope(gainNode, attack, peak, decay, sustain, release) {
  const t = now();
  gainNode.gain.setValueAtTime(0.001, t);
  gainNode.gain.linearRampToValueAtTime(peak, t + attack);
  gainNode.gain.linearRampToValueAtTime(sustain, t + attack + decay);
  gainNode.gain.linearRampToValueAtTime(0.001, t + attack + decay + release);
}

function scheduleStop(node, totalDur) {
  try { node.stop(now() + totalDur + 0.05); } catch (e) {}
}

function layeredTone(freq, type, duration, vol, detuneRange = 10) {
  const g = gain(0);
  const t = now();

  const o1 = osc(type, freq, randDetune());
  const o2 = osc(type, freq * 1.002, -randDetune());
  o1.connect(g); o2.connect(g);

  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);

  o1.start(t); o2.start(t);
  o1.stop(t + duration + 0.05);
  o2.stop(t + duration + 0.05);
  return { g, o1, o2 };
}

// Volume tiers
const VOL_UI = 0.30;
const VOL_ACTION = 0.55;
const VOL_FEEDBACK = 0.70;
const VOL_BIG = 0.85;
const VOL_BG = 0.18;

// ── UI Sounds ──

export function playClick() {
  if (!ensureCtx()) return;
  const t = now();
  const g = gain(0);

  const o1 = osc('sine', 900, randDetune());
  const o2 = osc('triangle', 1400, randDetune());
  o1.connect(g); o2.connect(g);

  g.gain.setValueAtTime(VOL_UI, t);
  g.gain.exponentialRampToValueAtTime(VOL_UI * 0.6, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  o1.frequency.setValueAtTime(900, t);
  o1.frequency.exponentialRampToValueAtTime(600, t + 0.06);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.09); o2.stop(t + 0.09);

  playNoiseBurst(0.02, VOL_UI * 0.15, 5000);
}

export function playHover() {
  if (!ensureCtx()) return;
  const t = now();
  const g = gain(0);
  const o1 = osc('sine', 680, randDetune());
  o1.connect(g);
  g.gain.setValueAtTime(VOL_UI * 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  o1.start(t); o1.stop(t + 0.06);
}

// ── Positive Feedback ──

export function playSuccess() {
  if (!ensureCtx()) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      if (!ensureCtx()) return;
      const t = now();
      const g1 = gain(0);
      const vol = VOL_FEEDBACK * (0.7 + i * 0.15);

      const o1 = osc('sine', freq, randDetune());
      const o2 = osc('triangle', freq * 2, randDetune());
      o1.connect(g1); o2.connect(g1);

      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(vol, t + 0.01);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      o1.start(t); o2.start(t);
      o1.stop(t + 0.25); o2.stop(t + 0.25);
    }, i * 100);
  });

  setTimeout(() => {
    if (ensureCtx()) playNoiseBurst(0.08, 0.04, 8000, 'highpass');
  }, 220);
}

export function playScoreUp(pitchOffset = 0) {
  if (!ensureCtx()) return;

  const elapsed = performance.now() - lastScoreUpTime;
  if (elapsed < 500) {
    scoreUpCombo = Math.min(scoreUpCombo + 1, 12);
  } else {
    scoreUpCombo = 0;
  }
  lastScoreUpTime = performance.now();

  const baseFreq = 880 + pitchOffset + scoreUpCombo * 60;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', baseFreq, randDetune());
  const o2 = osc('triangle', baseFreq * 1.5, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  o1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.08);
  o2.frequency.exponentialRampToValueAtTime(baseFreq * 2, t + 0.08);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.15); o2.stop(t + 0.15);
}

export function playLevelUp() {
  if (!ensureCtx()) return;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      if (!ensureCtx()) return;
      const t = now();
      const g1 = gain(0);
      const vol = VOL_BIG * (0.6 + i * 0.2);

      const o1 = osc('sine', freq, randDetune());
      const o2 = osc('triangle', freq * 2, randDetune());
      const o3 = osc('sine', freq * 0.5, randDetune());
      o1.connect(g1); o2.connect(g1); o3.connect(g1);

      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(vol, t + 0.015);
      g1.gain.exponentialRampToValueAtTime(vol * 0.3, t + 0.15);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      o1.start(t); o2.start(t); o3.start(t);
      o1.stop(t + 0.4); o2.stop(t + 0.4); o3.stop(t + 0.4);
    }, i * 120);
  });

  setTimeout(() => {
    if (ensureCtx()) playNoiseBurst(0.15, 0.12, 6000, 'highpass');
  }, 300);
}

export function playPerfect() {
  if (!ensureCtx()) return;
  const t = now();
  const dur = 0.6;
  const g1 = gain(0);

  const o1 = osc('sine', 1047, randDetune());
  const o2 = osc('sine', 1055, randDetune());
  const o3 = osc('triangle', 2094, randDetune());
  o1.connect(g1); o2.connect(g1); o3.connect(g1);

  g1.gain.setValueAtTime(VOL_BIG * 0.8, t);
  g1.gain.setValueAtTime(VOL_BIG * 0.5, t + 0.15);
  g1.gain.setValueAtTime(VOL_BIG * 0.8, t + 0.2);
  g1.gain.setValueAtTime(VOL_BIG * 0.5, t + 0.3);
  g1.gain.exponentialRampToValueAtTime(0.001, t + dur);

  o1.start(t); o2.start(t); o3.start(t);
  o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); o3.stop(t + dur + 0.05);

  playNoiseBurst(0.3, 0.03, 10000, 'highpass');
}

// ── Negative Feedback ──

export function playError() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sawtooth', 180, randDetune());
  const o2 = osc('sawtooth', 170, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_FEEDBACK * 0.7, t);
  g1.gain.exponentialRampToValueAtTime(VOL_FEEDBACK * 0.4, t + 0.08);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

  o1.frequency.setValueAtTime(180, t);
  o1.frequency.exponentialRampToValueAtTime(160, t + 0.15);
  o2.frequency.setValueAtTime(170, t);
  o2.frequency.exponentialRampToValueAtTime(150, t + 0.15);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.22); o2.stop(t + 0.22);
}

export function playGameOver() {
  if (!ensureCtx()) return;
  const notes = [392, 370, 349, 330];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      if (!ensureCtx()) return;
      const t = now();
      const g1 = gain(0);

      const o1 = osc('sine', freq, randDetune());
      const o2 = osc('triangle', freq * 0.5, randDetune());
      o1.connect(g1); o2.connect(g1);

      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(VOL_FEEDBACK * 0.6, t + 0.02);
      g1.gain.exponentialRampToValueAtTime(VOL_FEEDBACK * 0.2, t + 0.2);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      o1.start(t); o2.start(t);
      o1.stop(t + 0.55); o2.stop(t + 0.55);
    }, i * 200);
  });
}

export function playDamage() {
  if (!ensureCtx()) return;
  const t = now();

  playNoiseBurst(0.06, VOL_FEEDBACK * 0.5, 3000);

  const g1 = gain(0);
  const o1 = osc('sine', 80, randDetune());
  const o2 = osc('sine', 85, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_FEEDBACK * 0.7, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.1); o2.stop(t + 0.1);
}

// ── Action Sounds ──

export function playBounce() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', 600, randDetune());
  const o2 = osc('triangle', 900, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION, t);
  g1.gain.exponentialRampToValueAtTime(VOL_ACTION * 0.3, t + 0.06);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

  o1.frequency.setValueAtTime(600, t);
  o1.frequency.exponentialRampToValueAtTime(150, t + 0.04);
  o1.frequency.linearRampToValueAtTime(300, t + 0.12);
  o1.frequency.exponentialRampToValueAtTime(180, t + 0.18);

  o2.frequency.setValueAtTime(900, t);
  o2.frequency.exponentialRampToValueAtTime(250, t + 0.04);
  o2.frequency.linearRampToValueAtTime(450, t + 0.12);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.22); o2.stop(t + 0.22);
}

export function playCollect() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', 1200, randDetune());
  const o2 = osc('sine', 1205, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION, t);
  g1.gain.exponentialRampToValueAtTime(VOL_ACTION * 0.4, t + 0.04);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  o1.frequency.setValueAtTime(1200, t);
  o1.frequency.exponentialRampToValueAtTime(1800, t + 0.03);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.18); o2.stop(t + 0.18);

  setTimeout(() => {
    if (!ensureCtx()) return;
    const g2 = gain(0);
    const o3 = osc('triangle', 2400, randDetune());
    o3.connect(g2);
    const t2 = now();
    g2.gain.setValueAtTime(VOL_ACTION * 0.3, t2);
    g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.08);
    o3.start(t2); o3.stop(t2 + 0.1);
  }, 30);
}

export function playExplosion() {
  if (!ensureCtx()) return;
  const t = now();

  playNoiseBurst(0.2, VOL_ACTION * 0.7, 2000);

  const g1 = gain(0);
  const o1 = osc('sine', 60, randDetune());
  const o2 = osc('sine', 45, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.8, t);
  g1.gain.exponentialRampToValueAtTime(VOL_ACTION * 0.3, t + 0.06);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

  o1.frequency.exponentialRampToValueAtTime(30, t + 0.2);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.25); o2.stop(t + 0.25);
}

export function playDeal() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.12);
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(3000, t);
  filt.frequency.exponentialRampToValueAtTime(1000, t + 0.1);
  filt.Q.setValueAtTime(1.5, t);
  src.connect(filt);
  filt.connect(g1);

  g1.gain.setValueAtTime(VOL_UI * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  src.start(t); src.stop(t + 0.12);
}

export function playFlip() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', 300, randDetune());
  o1.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  o1.frequency.setValueAtTime(300, t);
  o1.frequency.exponentialRampToValueAtTime(800, t + 0.04);
  o1.frequency.exponentialRampToValueAtTime(400, t + 0.1);

  o1.start(t); o1.stop(t + 0.12);

  playNoiseBurst(0.05, VOL_ACTION * 0.15, 6000);
}

export function playDrop() {
  if (!ensureCtx()) return;
  const t = now();

  const g1 = gain(0);
  const o1 = osc('sine', 80, randDetune());
  const o2 = osc('sine', 82, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.8, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.15); o2.stop(t + 0.15);

  playNoiseBurst(0.04, VOL_ACTION * 0.3, 2500);
}

export function playLock() {
  if (!ensureCtx()) return;
  const t = now();

  const g1 = gain(0);
  const o1 = osc('square', 1200, randDetune());
  o1.connect(g1);
  g1.gain.setValueAtTime(VOL_ACTION * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  o1.start(t); o1.stop(t + 0.03);

  setTimeout(() => {
    if (!ensureCtx()) return;
    const g2 = gain(0);
    const o2 = osc('sine', 200, randDetune());
    const o3 = osc('sine', 205, randDetune());
    o2.connect(g2); o3.connect(g2);
    const t2 = now();
    g2.gain.setValueAtTime(VOL_ACTION * 0.6, t2);
    g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.06);
    o2.start(t2); o3.start(t2);
    o2.stop(t2 + 0.08); o3.stop(t2 + 0.08);
  }, 25);
}

export function playAlarm() {
  if (!ensureCtx()) return;
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      if (!ensureCtx()) return;
      const t = now();
      const g1 = gain(0);
      const o1 = osc('triangle', 400, randDetune());
      const o2 = osc('triangle', 405, randDetune());
      o1.connect(g1); o2.connect(g1);
      g1.gain.setValueAtTime(VOL_FEEDBACK * 0.6, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o1.start(t); o2.start(t);
      o1.stop(t + 0.12); o2.stop(t + 0.12);

      setTimeout(() => {
        if (!ensureCtx()) return;
        const t2 = now();
        const g2 = gain(0);
        const o3 = osc('triangle', 420, randDetune());
        const o4 = osc('triangle', 425, randDetune());
        o3.connect(g2); o4.connect(g2);
        g2.gain.setValueAtTime(VOL_FEEDBACK * 0.6, t2);
        g2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.1);
        o3.start(t2); o4.start(t2);
        o3.stop(t2 + 0.12); o4.stop(t2 + 0.12);
      }, 100);
    }, i * 220);
  }
}

export function playShoot() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('square', 1200, randDetune());
  const o2 = osc('sawtooth', 800, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

  o1.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  o2.frequency.exponentialRampToValueAtTime(100, t + 0.08);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.1); o2.stop(t + 0.1);

  playNoiseBurst(0.03, VOL_ACTION * 0.2, 8000);
}

export function playTick() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);
  const o1 = osc('sine', 1000, randDetune());
  o1.connect(g1);
  g1.gain.setValueAtTime(VOL_UI * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  o1.start(t); o1.stop(t + 0.05);
}

export function playSpin() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', 300, randDetune());
  const o2 = osc('triangle', 600, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  o1.frequency.exponentialRampToValueAtTime(900, t + 0.2);
  o1.frequency.exponentialRampToValueAtTime(300, t + 0.4);
  o2.frequency.exponentialRampToValueAtTime(1800, t + 0.2);
  o2.frequency.exponentialRampToValueAtTime(600, t + 0.4);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.45); o2.stop(t + 0.45);
}

// ── New Sound Functions ──

export function playComboHit(comboCount = 1) {
  if (!ensureCtx()) return;
  const baseFreq = 700 + Math.min(comboCount, 15) * 80;
  const t = now();
  const g1 = gain(0);
  const vol = Math.min(VOL_BIG, VOL_ACTION + comboCount * 0.03);

  const o1 = osc('sine', baseFreq, randDetune());
  const o2 = osc('triangle', baseFreq * 1.5, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(vol, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  o1.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t + 0.06);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.15); o2.stop(t + 0.15);

  if (comboCount >= 5) playNoiseBurst(0.04, 0.05, 8000, 'highpass');
}

export function playCardSlide() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.1);
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(2000, t);
  filt.frequency.exponentialRampToValueAtTime(800, t + 0.08);
  filt.Q.setValueAtTime(1, t);
  src.connect(filt);
  filt.connect(g1);

  g1.gain.setValueAtTime(VOL_UI * 0.35, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  src.start(t); src.stop(t + 0.1);
}

export function playCritical() {
  if (!ensureCtx()) return;
  playDamage();
  setTimeout(() => {
    if (!ensureCtx()) return;
    const t = now();
    const g1 = gain(0);
    const o1 = osc('sine', 40, 0);
    o1.connect(g1);
    g1.gain.setValueAtTime(VOL_BIG * 0.5, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o1.start(t); o1.stop(t + 0.18);
    playNoiseBurst(0.08, VOL_FEEDBACK * 0.4, 1500);
  }, 40);
}

export function playWhoosh() {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.15);
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.setValueAtTime(500, t);
  filt.frequency.exponentialRampToValueAtTime(4000, t + 0.06);
  filt.frequency.exponentialRampToValueAtTime(800, t + 0.12);
  filt.Q.setValueAtTime(3, t);
  src.connect(filt);
  filt.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.5, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  src.start(t); src.stop(t + 0.15);
}

export function playChime(note = 440) {
  if (!ensureCtx()) return;
  const t = now();
  const g1 = gain(0);

  const o1 = osc('sine', note, randDetune());
  const o2 = osc('sine', note * 3, randDetune());
  o1.connect(g1); o2.connect(g1);

  g1.gain.setValueAtTime(VOL_ACTION * 0.6, t);
  g1.gain.exponentialRampToValueAtTime(VOL_ACTION * 0.2, t + 0.2);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

  o1.start(t); o2.start(t);
  o1.stop(t + 0.65); o2.stop(t + 0.65);
}

export function playVictoryFanfare() {
  if (!ensureCtx()) return;
  const arp = [523, 659, 784, 1047];
  arp.forEach((freq, i) => {
    setTimeout(() => {
      if (!ensureCtx()) return;
      const t = now();
      const g1 = gain(0);
      const vol = VOL_BIG * (0.5 + i * 0.15);

      const o1 = osc('sine', freq, randDetune());
      const o2 = osc('triangle', freq * 2, randDetune());
      const o3 = osc('sine', freq * 0.5, randDetune());
      o1.connect(g1); o2.connect(g1); o3.connect(g1);

      g1.gain.setValueAtTime(0.001, t);
      g1.gain.linearRampToValueAtTime(vol, t + 0.015);
      g1.gain.exponentialRampToValueAtTime(vol * 0.5, t + 0.15);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      o1.start(t); o2.start(t); o3.start(t);
      o1.stop(t + 0.4); o2.stop(t + 0.4); o3.stop(t + 0.4);
    }, i * 100);
  });

  setTimeout(() => {
    if (!ensureCtx()) return;
    playNoiseBurst(0.25, 0.15, 6000, 'highpass');

    const t = now();
    const g1 = gain(0);
    const chord = [523, 659, 784];
    const oscs = chord.map(f => {
      const o = osc('sine', f, randDetune());
      o.connect(g1);
      return o;
    });
    g1.gain.setValueAtTime(VOL_BIG * 0.8, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    oscs.forEach(o => { o.start(t); o.stop(t + 0.55); });
  }, 450);
}

export function playTension() {
  if (!ensureCtx()) return;
  stopTension();
  const t = now();

  tensionGain = gain(0);
  tensionOsc = osc('sine', 55, 0);
  const o2 = osc('sine', 57, 0);
  tensionOsc.connect(tensionGain);
  o2.connect(tensionGain);

  tensionGain.gain.setValueAtTime(0.001, t);
  tensionGain.gain.linearRampToValueAtTime(VOL_ACTION * 0.4, t + 2);

  tensionOsc.start(t); o2.start(t);
  tensionOsc._partner = o2;
}

function stopTension() {
  if (tensionOsc) {
    try { tensionOsc.stop(); } catch (e) {}
    try { tensionOsc._partner?.stop(); } catch (e) {}
    tensionOsc = null;
  }
  if (tensionGain) {
    try { tensionGain.gain.setValueAtTime(0, ctx.currentTime); } catch (e) {}
    tensionGain = null;
  }
}

export function playRelease() {
  if (!ensureCtx()) return;
  stopTension();
  const t = now();
  const g1 = gain(0);
  const chord = [262, 330, 392];
  const oscs = chord.map(f => {
    const o = osc('sine', f, randDetune());
    o.connect(g1);
    return o;
  });
  g1.gain.setValueAtTime(VOL_FEEDBACK * 0.6, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  oscs.forEach(o => { o.start(t); o.stop(t + 0.65); });
}

// ── Background Music Loop ──

export function playBGLoop(tempo = 120) {
  if (!ensureCtx()) return;
  stopBGLoop();
  const beatMs = (60 / tempo) * 1000;
  let beat = 0;

  function tick() {
    if (muted || !ctx) return;
    const t = now();

    if (beat % 4 === 0) {
      const gk = gain(0);
      const ok = osc('sine', 60, 0);
      ok.connect(gk);
      gk.gain.setValueAtTime(VOL_BG * 1.2, t);
      gk.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      ok.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      ok.start(t); ok.stop(t + 0.15);
    }

    if (beat % 4 === 2) {
      const gk = gain(0);
      const ok = osc('sine', 55, 0);
      ok.connect(gk);
      gk.gain.setValueAtTime(VOL_BG * 0.9, t);
      gk.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      ok.frequency.exponentialRampToValueAtTime(28, t + 0.1);
      ok.start(t); ok.stop(t + 0.12);
    }

    {
      const gh = gain(0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.04);
      const filt = ctx.createBiquadFilter();
      filt.type = 'highpass';
      filt.frequency.setValueAtTime(8000, t);
      src.connect(filt);
      filt.connect(gh);
      gh.gain.setValueAtTime(VOL_BG * 0.5, t);
      gh.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.start(t); src.stop(t + 0.04);
    }

    if (beat % 4 === 0) {
      const gb = gain(0);
      const ob = osc('sine', 80, 0);
      ob.connect(gb);
      gb.gain.setValueAtTime(VOL_BG * 0.7, t);
      gb.gain.exponentialRampToValueAtTime(VOL_BG * 0.3, t + 0.2);
      gb.gain.exponentialRampToValueAtTime(0.001, t + beatMs / 1000);
      ob.start(t); ob.stop(t + beatMs / 1000 + 0.05);
    }

    beat++;
  }

  tick();
  bgInterval = setInterval(tick, beatMs / 2);
}

export function stopBGLoop() {
  if (bgInterval) {
    clearInterval(bgInterval);
    bgInterval = null;
  }
}

export function hit() {
  playDamage();
}

export function score() {
  playScoreUp();
}

export function bigScore() {
  playLevelUp();
}

export function miss() {
  playError();
}

export function win() {
  playVictoryFanfare();
}

export function lose() {
  playGameOver();
}

export function click() {
  playClick();
}

export function place() {
  playDrop();
}

export function flip() {
  playFlip();
}

export function move() {
  playHover();
}

export function combo(n = 1) {
  playComboHit(n);
}

export function tick() {
  playTick();
}

export function countdown() {
  playAlarm();
}

export function unlock() {
  playPerfect();
}

const MGPAudio = {
  initAudio,
  hasAudio,
  setVolume,
  muteAll,
  isMuted,
  toggle,
  isEnabled,
  playClick,
  playHover,
  playSuccess,
  playScoreUp,
  playLevelUp,
  playPerfect,
  playError,
  playGameOver,
  playDamage,
  playBounce,
  playCollect,
  playExplosion,
  playDeal,
  playFlip,
  playDrop,
  playLock,
  playAlarm,
  playShoot,
  playTick,
  playSpin,
  playComboHit,
  playCardSlide,
  playCritical,
  playWhoosh,
  playChime,
  playVictoryFanfare,
  playTension,
  playRelease,
  playBGLoop,
  stopBGLoop,
  hit,
  score,
  bigScore,
  miss,
  win,
  lose,
  click,
  place,
  flip,
  move,
  combo,
  tick,
  countdown,
  unlock,
};

if (typeof window !== 'undefined') {
  window.MGPAudio = MGPAudio;
}

export default MGPAudio;
