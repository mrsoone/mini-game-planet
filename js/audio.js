// MiniGamePlanet — Shared Web Audio Sound Engine
// Procedural sound generation via Web Audio API. No external audio files.

let ctx = null;
let masterGain = null;
let muted = false;
let volume = 1;
let bgOsc = null;
let bgInterval = null;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
}

export function hasAudio() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.setValueAtTime(volume, ctx.currentTime);
}

export function muteAll() {
  muted = !muted;
  if (masterGain) masterGain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
  return muted;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function createGain(v = 0.3) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(v, ctx.currentTime);
  g.connect(masterGain);
  return g;
}

function playTone(freq, type, duration, vol = 0.3, detune = 0) {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (detune) osc.detune.setValueAtTime(detune, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

function playNoise(duration, vol = 0.15, filterFreq = 4000) {
  if (!ensureCtx()) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = new Uint32Array(bufferSize);
  crypto.getRandomValues(rand);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (rand[i] / 4294967295) * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
  const g = createGain(0);
  src.connect(filter);
  filter.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.start(t);
  src.stop(t + duration + 0.05);
}

// --- UI Sounds ---

export function playClick() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.start(t);
  osc.stop(t + 0.08);
}

export function playHover() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.start(t);
  osc.stop(t + 0.06);
}

// --- Positive Feedback ---

export function playSuccess() {
  if (!ensureCtx()) return;
  playTone(523, 'sine', 0.15, 0.25);
  setTimeout(() => playTone(659, 'sine', 0.2, 0.25), 120);
}

export function playScoreUp(pitchOffset = 0) {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880 + pitchOffset, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(1320 + pitchOffset, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function playLevelUp() {
  if (!ensureCtx()) return;
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 'sine', 0.2, 0.25), i * 100);
  });
}

export function playPerfect() {
  if (!ensureCtx()) return;
  const notes = [784, 988, 1175, 1319, 1568];
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 'sine', 0.3 - i * 0.04, 0.15 - i * 0.02);
    }, i * 60);
  });
}

// --- Negative Feedback ---

export function playError() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.start(t);
  osc.stop(t + 0.25);
}

export function playGameOver() {
  if (!ensureCtx()) return;
  const notes = [440, 349, 262];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 'sine', 0.3, 0.2), i * 180);
  });
}

export function playDamage() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.frequency.linearRampToValueAtTime(80, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.15);
}

// --- Action Sounds ---

export function playFlip() {
  if (!ensureCtx()) return;
  playNoise(0.08, 0.12, 6000);
  playTone(400, 'sine', 0.06, 0.1);
}

export function playDrop() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.12);
}

export function playExplosion() {
  if (!ensureCtx()) return;
  playNoise(0.3, 0.3, 2000);
  playTone(60, 'sine', 0.25, 0.2);
}

export function playBounce() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
  osc.frequency.exponentialRampToValueAtTime(150, t + 0.15);
  osc.start(t);
  osc.stop(t + 0.18);
}

export function playShoot() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playCollect() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(988, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.frequency.setValueAtTime(988, t);
  osc.frequency.exponentialRampToValueAtTime(1319, t + 0.06);
  osc.start(t);
  osc.stop(t + 0.18);
}

export function playTick() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  osc.start(t);
  osc.stop(t + 0.05);
}

export function playAlarm() {
  if (!ensureCtx()) return;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      playTone(880, 'square', 0.08, 0.2);
      setTimeout(() => playTone(660, 'square', 0.08, 0.2), 80);
    }, i * 200);
  }
}

export function playDeal() {
  if (!ensureCtx()) return;
  playNoise(0.06, 0.08, 3000);
}

export function playSpin() {
  if (!ensureCtx()) return;
  const g = createGain(0);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.connect(g);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.frequency.exponentialRampToValueAtTime(900, t + 0.2);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.4);
  osc.start(t);
  osc.stop(t + 0.45);
}

export function playLock() {
  if (!ensureCtx()) return;
  playTone(600, 'square', 0.04, 0.2);
  setTimeout(() => playTone(800, 'square', 0.06, 0.15), 40);
}

// --- Background Music Loop ---

export function playBGLoop(tempo = 120) {
  if (!ensureCtx()) return;
  stopBGLoop();
  const interval = (60 / tempo) * 1000;
  let beat = 0;
  bgInterval = setInterval(() => {
    if (muted) return;
    const isKick = beat % 4 === 0;
    const isSnare = beat % 4 === 2;
    const isHat = beat % 2 === 0;
    if (isKick) {
      playTone(80, 'sine', 0.1, 0.15);
    }
    if (isSnare) {
      playNoise(0.08, 0.06, 5000);
    }
    if (isHat) {
      playNoise(0.03, 0.04, 8000);
    }
    beat++;
  }, interval / 2);
}

export function stopBGLoop() {
  if (bgInterval) {
    clearInterval(bgInterval);
    bgInterval = null;
  }
}
