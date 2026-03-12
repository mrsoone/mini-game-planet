// MiniGamePlanet — Shared Visual Effects Module
// Particles, score popups, screen effects, toasts, transitions.
// CSS-based where possible for GPU acceleration. Import into every game.

const MAX_PARTICLES = 50;
let activeParticles = [];
let particlePool = [];

// ── Particle System ──

function getParticleEl() {
  if (particlePool.length > 0) return particlePool.pop();
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;pointer-events:none;will-change:transform,opacity;z-index:9999;';
  document.body.appendChild(el);
  return el;
}

function recycleParticle(el) {
  el.style.opacity = '0';
  el.style.display = 'none';
  particlePool.push(el);
}

function drawStar(size, color) {
  const el = document.createElement('div');
  el.style.cssText = `width:${size}px;height:${size}px;`;
  el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg>`;
  return el.innerHTML;
}

export function createParticles({
  x, y,
  count = 12,
  colors = ['#F59E0B', '#EF4444', '#10B981'],
  spread = 120,
  speed = { min: 2, max: 6 },
  size = { min: 4, max: 8 },
  lifetime = 800,
  gravity = 0.5,
  shapes = ['circle']
} = {}) {
  const baseAngle = -90;
  const halfSpread = spread / 2;

  for (let i = 0; i < count; i++) {
    if (activeParticles.length >= MAX_PARTICLES) {
      const old = activeParticles.shift();
      recycleParticle(old.el);
    }

    const el = getParticleEl();
    const s = size.min + Math.random() * (size.max - size.min);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    el.style.display = 'block';
    el.style.width = s + 'px';
    el.style.height = s + 'px';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.opacity = '1';

    if (shape === 'star') {
      el.style.borderRadius = '0';
      el.style.background = 'none';
      el.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${color}"><polygon points="12,2 15,9 22,9 16,14 18,21 12,17 6,21 8,14 2,9 9,9"/></svg>`;
    } else if (shape === 'square') {
      el.style.borderRadius = '2px';
      el.style.background = color;
      el.innerHTML = '';
    } else {
      el.style.borderRadius = '50%';
      el.style.background = color;
      el.innerHTML = '';
    }

    const angle = (baseAngle - halfSpread + Math.random() * spread) * (Math.PI / 180);
    const spd = speed.min + Math.random() * (speed.max - speed.min);
    const vx = Math.cos(angle) * spd;
    const vy = Math.sin(angle) * spd;

    const p = { el, x, y, vx, vy, life: lifetime, maxLife: lifetime, gravity };
    activeParticles.push(p);
  }

  if (!_particleLoop) startParticleLoop();
}

let _particleLoop = null;
let _lastParticleTime = 0;

function startParticleLoop() {
  _lastParticleTime = performance.now();
  function tick(t) {
    const dt = Math.min(t - _lastParticleTime, 50);
    _lastParticleTime = t;
    const factor = dt / 16.67;

    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      p.vy += p.gravity * factor * 0.3;
      p.x += p.vx * factor;
      p.y += p.vy * factor;
      p.life -= dt;

      const progress = 1 - p.life / p.maxLife;
      const opacity = Math.max(0, 1 - progress * progress);
      const scale = 1 - progress * 0.5;

      p.el.style.transform = `translate(${p.x - parseFloat(p.el.style.width) / 2}px, ${p.y - parseFloat(p.el.style.height) / 2}px) scale(${scale})`;
      p.el.style.left = '0';
      p.el.style.top = '0';
      p.el.style.opacity = opacity;

      if (p.life <= 0) {
        recycleParticle(p.el);
        activeParticles.splice(i, 1);
      }
    }

    if (activeParticles.length > 0) {
      _particleLoop = requestAnimationFrame(tick);
    } else {
      _particleLoop = null;
    }
  }
  _particleLoop = requestAnimationFrame(tick);
}

// ── Preset Particle Effects ──

export function confetti(x, y) {
  createParticles({
    x, y,
    count: 30,
    colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'],
    spread: 360,
    speed: { min: 3, max: 8 },
    size: { min: 4, max: 8 },
    lifetime: 1200,
    gravity: 0.8,
    shapes: ['square', 'circle']
  });
}

export function sparkle(x, y) {
  createParticles({
    x, y,
    count: 8,
    colors: ['#FFD700', '#FFF8DC', '#FFFACD'],
    spread: 360,
    speed: { min: 1, max: 3 },
    size: { min: 2, max: 5 },
    lifetime: 600,
    gravity: -0.2,
    shapes: ['circle', 'star']
  });
}

export function smoke(x, y) {
  createParticles({
    x, y,
    count: 10,
    colors: ['#6B7280', '#9CA3AF', '#D1D5DB'],
    spread: 90,
    speed: { min: 0.5, max: 2 },
    size: { min: 6, max: 14 },
    lifetime: 1000,
    gravity: -0.6,
    shapes: ['circle']
  });
}

export function bloodSplat(x, y) {
  createParticles({
    x, y,
    count: 10,
    colors: ['#DC2626', '#EF4444', '#B91C1C'],
    spread: 60,
    speed: { min: 3, max: 7 },
    size: { min: 3, max: 6 },
    lifetime: 500,
    gravity: 1.2,
    shapes: ['circle']
  });
}

export function levelUpBurst(x, y) {
  createParticles({
    x, y,
    count: 20,
    colors: ['#FFD700', '#FFA500', '#FBBF24'],
    spread: 360,
    speed: { min: 4, max: 9 },
    size: { min: 3, max: 6 },
    lifetime: 800,
    gravity: 0.1,
    shapes: ['circle', 'star']
  });

  const ring = document.createElement('div');
  ring.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px; width: 0; height: 0;
    border: 3px solid #FFD700; border-radius: 50%; pointer-events: none;
    transform: translate(-50%, -50%); z-index: 9998; opacity: 1;
    transition: all 0.5s ease-out;
  `;
  document.body.appendChild(ring);
  requestAnimationFrame(() => {
    ring.style.width = '120px';
    ring.style.height = '120px';
    ring.style.opacity = '0';
    ring.style.borderWidth = '1px';
  });
  setTimeout(() => ring.remove(), 600);
}

// ── Score Popup System ──

const POPUP_SIZES = { sm: 14, md: 20, lg: 28, xl: 36 };

export function showScorePopup({
  x, y,
  text = '+10',
  color = '#F59E0B',
  size = 'md',
  duration = 1000,
  style = 'float'
} = {}) {
  const el = document.createElement('div');
  const fontSize = POPUP_SIZES[size] || 20;
  el.textContent = text;
  el.style.cssText = `
    position: fixed; left: ${x}px; top: ${y}px;
    font-family: 'DM Mono', monospace; font-size: ${fontSize}px; font-weight: 700;
    color: ${color}; pointer-events: none; z-index: 10000;
    transform: translate(-50%, -50%); white-space: nowrap;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  `;

  if (size === 'lg' || size === 'xl') {
    el.style.textShadow = `0 0 10px ${color}40, 0 1px 3px rgba(0,0,0,0.3)`;
  }

  document.body.appendChild(el);

  if (style === 'float') {
    el.style.transition = `transform ${duration}ms ease-out, opacity ${duration * 0.6}ms ease-in ${duration * 0.4}ms`;
    requestAnimationFrame(() => {
      el.style.transform = `translate(-50%, calc(-50% - 50px))`;
      el.style.opacity = '0';
    });
  } else if (style === 'pop') {
    el.style.transform = 'translate(-50%, -50%) scale(0.3)';
    el.style.transition = `transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${duration * 0.5}ms ease-in ${duration * 0.5}ms`;
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%, -50%) scale(1)';
      setTimeout(() => { el.style.opacity = '0'; }, duration * 0.4);
    });
  } else if (style === 'shake') {
    el.style.transition = `opacity ${duration * 0.5}ms ease-in ${duration * 0.5}ms`;
    let frame = 0;
    const shakeAnim = () => {
      if (frame > duration / 16) return;
      const ox = (Math.random() - 0.5) * 6;
      el.style.transform = `translate(calc(-50% + ${ox}px), -50%)`;
      frame++;
      requestAnimationFrame(shakeAnim);
    };
    shakeAnim();
    setTimeout(() => { el.style.opacity = '0'; }, duration * 0.6);
  }

  setTimeout(() => el.remove(), duration + 100);
}

// ── Screen Effects ──

export function screenShake(intensity = 5, duration = 300) {
  const container = document.querySelector('.game-container, #game-container, [data-game], main canvas')?.parentElement || document.querySelector('main') || document.body;
  const originalTransform = container.style.transform;
  let start = performance.now();

  function shake(t) {
    const elapsed = t - start;
    if (elapsed > duration) {
      container.style.transform = originalTransform || '';
      return;
    }
    const decay = 1 - elapsed / duration;
    const ox = (Math.random() - 0.5) * 2 * intensity * decay;
    const oy = (Math.random() - 0.5) * 2 * intensity * decay;
    container.style.transform = `translate(${ox}px, ${oy}px)`;
    requestAnimationFrame(shake);
  }
  requestAnimationFrame(shake);
}

export function screenFlash(color = 'white', duration = 200) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9997;
    background: ${color}; opacity: 0.3;
    transition: opacity ${duration}ms ease-out;
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '0'; });
  setTimeout(() => overlay.remove(), duration + 50);
}

export function screenPulse(color = '#3B82F6') {
  const container = document.querySelector('.game-container, #game-container, [data-game], main') || document.body;
  const original = container.style.boxShadow;
  container.style.transition = 'box-shadow 0.15s ease-in';
  container.style.boxShadow = `0 0 0 4px ${color}60, 0 0 20px ${color}30`;
  setTimeout(() => {
    container.style.transition = 'box-shadow 0.3s ease-out';
    container.style.boxShadow = original || '';
  }, 150);
}

export function slowMotion(duration = 200) {
  document.documentElement.style.setProperty('--mgp-time-scale', '0.5');
  const styleEl = document.getElementById('mgp-slow-mo') || (() => {
    const s = document.createElement('style');
    s.id = 'mgp-slow-mo';
    document.head.appendChild(s);
    return s;
  })();
  styleEl.textContent = `*, *::before, *::after { animation-duration: 2s !important; transition-duration: 0.5s !important; }`;
  setTimeout(() => {
    styleEl.textContent = '';
    document.documentElement.style.removeProperty('--mgp-time-scale');
  }, duration);
}

// ── Toast Notification System ──

const toastQueue = [];
const TOAST_COLORS = {
  success: { bg: '#059669', border: '#10B981' },
  warning: { bg: '#D97706', border: '#F59E0B' },
  error:   { bg: '#DC2626', border: '#EF4444' },
  info:    { bg: '#2563EB', border: '#3B82F6' },
  gold:    { bg: '#B45309', border: '#F59E0B' }
};

export function showToast({
  text = '',
  type = 'info',
  duration = 2000,
  position = 'top'
} = {}) {
  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;

  let container = document.getElementById('mgp-toast-container-' + position);
  if (!container) {
    container = document.createElement('div');
    container.id = 'mgp-toast-container-' + position;
    container.style.cssText = `
      position: fixed; ${position === 'top' ? 'top: 16px' : 'bottom: 16px'};
      left: 50%; transform: translateX(-50%); z-index: 10001;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 10px 20px; border-radius: 10px;
    background: ${colors.bg}; border: 1px solid ${colors.border};
    color: white; font-family: 'Space Grotesk', system-ui, sans-serif;
    font-size: 14px; font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    transform: translateY(${position === 'top' ? '-20px' : '20px'}) scale(0.9);
    opacity: 0; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto; white-space: nowrap;
  `;
  toast.textContent = text;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0) scale(1)';
    toast.style.opacity = '1';
  });

  setTimeout(() => {
    toast.style.transform = `translateY(${position === 'top' ? '-20px' : '20px'}) scale(0.9)`;
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ── Transition System ──

export function fadeTransition(callback) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: black; z-index: 10002;
    opacity: 0; transition: opacity 0.15s ease-in;
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  setTimeout(() => {
    if (callback) callback();
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.15s ease-out';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 180);
    }, 50);
  }, 180);
}

export function slideTransition(direction = 'left', callback) {
  const dirMap = { left: '-100%', right: '100%', up: '0', down: '0' };
  const dirMapY = { left: '0', right: '0', up: '-100%', down: '100%' };
  const container = document.querySelector('.game-container, #game-container, main') || document.body;
  const original = container.style.transition;

  container.style.transition = 'transform 0.2s ease-in, opacity 0.2s ease-in';
  container.style.transform = `translate(${dirMap[direction]}, ${dirMapY[direction]})`;
  container.style.opacity = '0';

  setTimeout(() => {
    if (callback) callback();
    const inDir = direction === 'left' ? 'right' : direction === 'right' ? 'left' : direction === 'up' ? 'down' : 'up';
    const inDirMap = { left: '-100%', right: '100%', up: '0', down: '0' };
    const inDirMapY = { left: '0', right: '0', up: '-100%', down: '100%' };
    container.style.transition = 'none';
    container.style.transform = `translate(${inDirMap[inDir]}, ${inDirMapY[inDir]})`;
    requestAnimationFrame(() => {
      container.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      container.style.transform = 'translate(0, 0)';
      container.style.opacity = '1';
    });
    setTimeout(() => { container.style.transition = original || ''; }, 250);
  }, 220);
}

// ── Canvas Particle Helpers (for canvas games) ──

export class CanvasParticleSystem {
  constructor(maxParticles = 60) {
    this.particles = [];
    this.max = maxParticles;
  }

  emit(x, y, {
    count = 10,
    colors = ['#F59E0B', '#EF4444', '#10B981'],
    speed = { min: 1, max: 4 },
    size = { min: 2, max: 5 },
    lifetime = 500,
    gravity = 0.1,
    spread = 360
  } = {}) {
    const baseAngle = -90;
    const halfSpread = spread / 2;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.max) this.particles.shift();
      const angle = (baseAngle - halfSpread + Math.random() * spread) * (Math.PI / 180);
      const spd = speed.min + Math.random() * (speed.max - speed.min);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: size.min + Math.random() * (size.max - size.min),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: lifetime,
        maxLife: lifetime,
        gravity
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity;
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ── Canvas Score Popup Helper ──

export class CanvasScorePopups {
  constructor() {
    this.popups = [];
  }

  add(x, y, text, color = '#FFD700', size = 16) {
    this.popups.push({
      x, y, text, color, size,
      life: 600, maxLife: 600, vy: -1.5
    });
  }

  update(dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.y += p.vy * (dt / 16.67);
      p.life -= dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.popups) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}

// ── Animated Number Display ──

export function animateNumber(element, from, to, duration = 300, prefix = '', suffix = '') {
  const start = performance.now();
  const diff = to - from;
  function tick(t) {
    const elapsed = t - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + diff * eased);
    element.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Combo Feedback Helper ──

export function comboFeedback(x, y, comboCount, points) {
  if (comboCount <= 2) {
    showScorePopup({ x, y, text: `+${points}`, color: '#FFFFFF', size: 'sm', style: 'float' });
  } else if (comboCount <= 4) {
    showScorePopup({ x, y, text: `+${points}`, color: '#F59E0B', size: 'md', style: 'float' });
    screenPulse('#F59E0B');
  } else if (comboCount <= 7) {
    showScorePopup({ x, y, text: `+${points} x${comboCount}`, color: '#F59E0B', size: 'lg', style: 'pop' });
    sparkle(x, y);
  } else if (comboCount <= 9) {
    showScorePopup({ x, y, text: `+${points} x${comboCount}!`, color: '#FFD700', size: 'xl', style: 'pop' });
    sparkle(x, y);
    screenShake(3, 150);
  } else {
    showScorePopup({ x, y, text: `+${points} x${comboCount}!!`, color: '#FFD700', size: 'xl', style: 'pop' });
    confetti(x, y);
    screenShake(5, 200);
    screenFlash('gold', 150);
  }
}

// ── Win / Loss Helpers ──

export function celebrateWin(containerEl) {
  const rect = containerEl?.getBoundingClientRect() || { left: window.innerWidth / 2, top: 100, width: 0 };
  const cx = rect.left + rect.width / 2;
  for (let i = 0; i < 5; i++) {
    setTimeout(() => confetti(cx + (Math.random() - 0.5) * 200, rect.top + 40), i * 100);
  }
  screenFlash('gold', 200);
}

export function showGameOver({
  container,
  score = 0,
  best = 0,
  isWin = false,
  message = '',
  onRestart
} = {}) {
  const isNewBest = score > best;
  const parent = container || document.querySelector('.game-container, #game-container, main') || document.body;
  const rect = parent.getBoundingClientRect();

  let existing = parent.querySelector('.mgp-gameover-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'mgp-gameover-overlay';
  overlay.style.cssText = `
    position: absolute; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s ease-in;
    border-radius: inherit;
  `;

  const title = isWin ? 'YOU WIN!' : (message || 'GAME OVER');
  const titleColor = isWin ? '#FFD700' : '#F5F5F4';
  const encouragement = !isWin && score > 0 && best > 0 && !isNewBest
    ? `So close! Just ${best - score} away from your best.`
    : '';

  overlay.innerHTML = `
    <div style="text-align:center;color:white;font-family:'Space Grotesk',system-ui,sans-serif;">
      <div style="font-size:36px;font-weight:700;color:${titleColor};margin-bottom:8px;
        ${isWin ? 'text-shadow:0 0 20px #FFD70060;' : ''}">${isWin ? '🏆 ' : ''}${title}</div>
      <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;margin:12px 0 4px;color:#F5F5F4;">
        ${score.toLocaleString()}
      </div>
      <div style="font-size:14px;color:#9CA3AF;margin-bottom:4px;">
        ${isNewBest
          ? '<span style="color:#FFD700;font-weight:600;">🏆 NEW BEST!</span>'
          : `Best: ${best.toLocaleString()}`}
      </div>
      ${encouragement ? `<div style="font-size:13px;color:#9CA3AF;margin-bottom:12px;">${encouragement}</div>` : ''}
      <button class="mgp-restart-btn" style="
        margin-top:16px;padding:12px 32px;
        background:#3B82F6;color:white;border:none;border-radius:10px;
        font-family:'Space Grotesk',system-ui,sans-serif;font-size:16px;font-weight:600;
        cursor:pointer;animation:mgp-pulse 2s infinite;
        box-shadow:0 4px 12px rgba(59,130,246,0.3);
        transition:transform 0.15s ease,box-shadow 0.15s ease;
      ">Play Again</button>
      <div style="font-size:11px;color:#6B7280;margin-top:8px;">Enter / Space</div>
    </div>
  `;

  if (!document.getElementById('mgp-gameover-style')) {
    const style = document.createElement('style');
    style.id = 'mgp-gameover-style';
    style.textContent = `
      @keyframes mgp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
      .mgp-restart-btn:hover{transform:scale(1.05)!important;box-shadow:0 6px 16px rgba(59,130,246,0.4)!important;}
      .mgp-restart-btn:active{transform:scale(0.97)!important;}
    `;
    document.head.appendChild(style);
  }

  if (parent.style.position === '' || parent.style.position === 'static') {
    parent.style.position = 'relative';
  }
  parent.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  const btn = overlay.querySelector('.mgp-restart-btn');
  setTimeout(() => btn.focus(), 100);

  const restart = () => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      if (onRestart) onRestart();
    }, 200);
  };

  btn.addEventListener('click', restart);
  const keyHandler = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.removeEventListener('keydown', keyHandler);
      restart();
    }
  };
  document.addEventListener('keydown', keyHandler);

  if (isNewBest) {
    setTimeout(() => {
      const r = overlay.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height * 0.3);
    }, 300);
  }
}
