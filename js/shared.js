// MiniGamePlanet — Shared UI Chrome (Nav, Footer, Related Games)
// Renders Design System-compliant nav, footer, and related game tiles.

import { games, categories } from '/data/games.js';
import { muteAll, isMuted, initAudio } from '/js/audio.js';
import { openConsentBanner } from '/js/consent.js';

const FAVICON_PATHS = {
  ico: '/images/favicon.ico',
  png32: '/images/favicon-32x32.png',
  apple: '/images/apple-touch-icon.png'
};

function upsertLink({ rel, href, type, sizes }) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  if (type) link.type = type;
  if (sizes) link.sizes = sizes;
}

function applyPlanetFavicon() {
  upsertLink({ rel: 'icon', href: FAVICON_PATHS.ico, type: 'image/x-icon' });
  upsertLink({ rel: 'shortcut icon', href: FAVICON_PATHS.ico, type: 'image/x-icon' });
  upsertLink({ rel: 'apple-touch-icon', href: FAVICON_PATHS.apple, type: 'image/png', sizes: '180x180' });
  upsertLink({ rel: 'icon', href: FAVICON_PATHS.png32, type: 'image/png', sizes: '32x32' });
}

function updateViewportHeightVar() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${h}px`);
}

function dispatchVirtualKey(code, key) {
  const event = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
}

function addMobileKeyboardFallback() {
  if (document.getElementById('mobile-controls')) return;
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  const pageScriptText = Array.from(document.scripts)
    .map(script => script.textContent || '')
    .join('\n')
    .toLowerCase();
  const keyboardDriven = /(keydown|arrowup|arrowdown|arrowleft|arrowright|keyw|keya|keys|keyd)/.test(pageScriptText);
  const alreadyTouchEnabled = /(touchstart|touchmove|touchend|pointerdown|pointermove|pointerup)/.test(pageScriptText);
  if (!keyboardDriven || alreadyTouchEnabled) return;

  const controls = document.createElement('div');
  controls.id = 'mobile-controls';
  controls.className = 'mobile-controls';
  controls.innerHTML = `
    <button class="mobile-control-btn" data-code="ArrowUp" data-key="ArrowUp">▲</button>
    <button class="mobile-control-btn" data-code="ArrowLeft" data-key="ArrowLeft">◀</button>
    <button class="mobile-control-btn" data-code="Space" data-key=" ">Tap</button>
    <button class="mobile-control-btn" data-code="ArrowRight" data-key="ArrowRight">▶</button>
    <button class="mobile-control-btn" data-code="ArrowDown" data-key="ArrowDown">▼</button>
  `;

  const parent = canvas.parentElement || canvas;
  parent.insertAdjacentElement('afterend', controls);

  controls.querySelectorAll('.mobile-control-btn').forEach(btn => {
    let repeatTimer = null;
    const code = btn.dataset.code;
    const key = btn.dataset.key;
    const press = () => {
      dispatchVirtualKey(code, key);
      if (code !== 'Space') {
        repeatTimer = setInterval(() => dispatchVirtualKey(code, key), 90);
      }
    };
    const release = () => {
      if (!repeatTimer) return;
      clearInterval(repeatTimer);
      repeatTimer = null;
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      press();
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  });

  let startPoint = null;
  canvas.addEventListener('touchstart', e => {
    if (!e.touches?.[0]) return;
    startPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!startPoint || !e.changedTouches?.[0]) return;
    const dx = e.changedTouches[0].clientX - startPoint.x;
    const dy = e.changedTouches[0].clientY - startPoint.y;
    const threshold = 24;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      dispatchVirtualKey('Space', ' ');
      startPoint = null;
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      dispatchVirtualKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft', dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    } else {
      dispatchVirtualKey(dy > 0 ? 'ArrowDown' : 'ArrowUp', dy > 0 ? 'ArrowDown' : 'ArrowUp');
    }
    startPoint = null;
  }, { passive: true });
}

function initGlobalMobileUX() {
  if (!document.head || document.getElementById('mgp-mobile-ux')) return;
  const style = document.createElement('style');
  style.id = 'mgp-mobile-ux';
  style.textContent = `
    :root { --app-vh: 100vh; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body { min-height: var(--app-vh); }
    canvas, svg, img, video { max-width: 100%; height: auto; }
    canvas { touch-action: none; }
    input, textarea, select, button { font-size: 16px; }
    @media (pointer: coarse) {
      button, [role="button"], .cat-pill, .speed-btn, a {
        min-height: 42px;
      }
      #nav-container nav {
        padding: 8px 12px !important;
        min-height: 56px !important;
        height: auto !important;
        flex-wrap: wrap;
        gap: 8px;
      }
      #nav-container nav > div {
        gap: 10px !important;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      #nav-container nav a, #nav-container nav button {
        font-size: 13px !important;
      }
      .mobile-controls {
        margin-top: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .mobile-control-btn {
        border: 2px solid #CBD5E1;
        background: #FFFFFF;
        border-radius: 12px;
        min-height: 48px;
        font-size: 18px;
        font-weight: 700;
        color: #0F172A;
        font-family: inherit;
      }
      .mobile-control-btn:active {
        background: #E2E8F0;
      }
    }
  `;
  document.head.appendChild(style);

  updateViewportHeightVar();
  window.addEventListener('resize', updateViewportHeightVar, { passive: true });
  window.visualViewport?.addEventListener('resize', updateViewportHeightVar, { passive: true });

  if (window.matchMedia('(pointer: coarse)').matches) {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', event => {
      const now = Date.now();
      if (now - lastTouchEnd <= 280) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener('touchmove', event => {
      const el = event.target instanceof Element ? event.target : null;
      if (el?.closest('canvas, .mobile-controls')) event.preventDefault();
    }, { passive: false });
    addMobileKeyboardFallback();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyPlanetFavicon();
    initGlobalMobileUX();
  }, { once: true });
} else {
  applyPlanetFavicon();
  initGlobalMobileUX();
}

function getCategoryAccent(catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.accent : '#64748B';
}

function getCategoryIcon(catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.icon : '🎮';
}

const GAME_PAGE_THEMES = {
  Arcade: {
    accentRgb: '8,145,178',
    base: 'radial-gradient(circle at 16% 12%, rgba(8,145,178,0.30), transparent 38%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.20), transparent 36%), linear-gradient(160deg, #071a22 0%, #102a43 55%, #0f172a 100%)',
    pattern: 'repeating-linear-gradient(135deg, rgba(125,211,252,0.06) 0 8px, transparent 8px 24px)',
    chips: ['🕹', '⚡', '🚀']
  },
  Puzzle: {
    accentRgb: '37,99,235',
    base: 'radial-gradient(circle at 14% 16%, rgba(37,99,235,0.25), transparent 35%), radial-gradient(circle at 86% 18%, rgba(99,102,241,0.22), transparent 38%), linear-gradient(160deg, #0b1d4a 0%, #1e3a8a 50%, #1e1b4b 100%)',
    pattern: 'repeating-linear-gradient(45deg, rgba(191,219,254,0.08) 0 6px, transparent 6px 22px)',
    chips: ['🧩', '🧠', '🔢']
  },
  Card: {
    accentRgb: '220,38,38',
    base: 'radial-gradient(circle at 20% 10%, rgba(220,38,38,0.26), transparent 38%), radial-gradient(circle at 85% 8%, rgba(244,63,94,0.20), transparent 32%), linear-gradient(165deg, #2a1111 0%, #4b1111 55%, #1f2937 100%)',
    pattern: 'repeating-linear-gradient(135deg, rgba(254,202,202,0.07) 0 10px, transparent 10px 26px)',
    chips: ['🃏', '♥', '♣']
  },
  Word: {
    accentRgb: '217,119,6',
    base: 'radial-gradient(circle at 14% 16%, rgba(217,119,6,0.24), transparent 36%), radial-gradient(circle at 86% 20%, rgba(234,88,12,0.20), transparent 34%), linear-gradient(160deg, #3f1d08 0%, #78350f 50%, #4a1d0b 100%)',
    pattern: 'repeating-linear-gradient(135deg, rgba(253,230,138,0.10) 0 3px, transparent 3px 20px)',
    chips: ['🔤', '✏️', '📚']
  },
  Strategy: {
    accentRgb: '13,148,136',
    base: 'radial-gradient(circle at 15% 16%, rgba(13,148,136,0.24), transparent 36%), radial-gradient(circle at 85% 15%, rgba(20,184,166,0.18), transparent 34%), linear-gradient(160deg, #062b2a 0%, #134e4a 55%, #0f172a 100%)',
    pattern: 'repeating-linear-gradient(90deg, rgba(153,246,228,0.07) 0 1px, transparent 1px 24px)',
    chips: ['♟️', '🧠', '🏆']
  },
  Casino: {
    accentRgb: '5,150,105',
    base: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.20), transparent 36%), radial-gradient(circle at 82% 14%, rgba(74,222,128,0.17), transparent 34%), linear-gradient(170deg, #0a2d22 0%, #14532d 55%, #052e2b 100%)',
    pattern: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 10px)',
    chips: ['🎰', '🪙', '♦️']
  },
  Casual: {
    accentRgb: '225,29,72',
    base: 'radial-gradient(circle at 14% 16%, rgba(225,29,72,0.25), transparent 36%), radial-gradient(circle at 87% 14%, rgba(236,72,153,0.18), transparent 34%), linear-gradient(165deg, #3f0a23 0%, #831843 55%, #3b0764 100%)',
    pattern: 'repeating-radial-gradient(circle at 20% 20%, rgba(253,164,175,0.08) 0 5px, transparent 5px 26px)',
    chips: ['🎯', '✨', '🌈']
  },
  Action: {
    accentRgb: '234,88,12',
    base: 'radial-gradient(circle at 15% 15%, rgba(234,88,12,0.28), transparent 36%), radial-gradient(circle at 87% 14%, rgba(249,115,22,0.20), transparent 35%), linear-gradient(165deg, #431407 0%, #7c2d12 55%, #1f2937 100%)',
    pattern: 'repeating-linear-gradient(120deg, rgba(253,186,116,0.09) 0 7px, transparent 7px 24px)',
    chips: ['🔥', '⚔️', '💥']
  },
  Board: {
    accentRgb: '79,70,229',
    base: 'radial-gradient(circle at 15% 14%, rgba(79,70,229,0.24), transparent 36%), radial-gradient(circle at 88% 16%, rgba(129,140,248,0.20), transparent 36%), linear-gradient(160deg, #1e1b4b 0%, #3730a3 55%, #1f2937 100%)',
    pattern: 'repeating-linear-gradient(0deg, rgba(199,210,254,0.07) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(199,210,254,0.07) 0 1px, transparent 1px 26px)',
    chips: ['🎲', '🏁', '🧭']
  },
  Builder: {
    accentRgb: '8,145,178',
    base: 'radial-gradient(circle at 14% 14%, rgba(8,145,178,0.24), transparent 35%), radial-gradient(circle at 84% 16%, rgba(6,182,212,0.20), transparent 36%), linear-gradient(165deg, #083344 0%, #0f766e 55%, #1f2937 100%)',
    pattern: 'repeating-linear-gradient(135deg, rgba(103,232,249,0.08) 0 8px, transparent 8px 20px)',
    chips: ['🏗', '🔧', '🎨']
  },
  Math: {
    accentRgb: '2,132,199',
    base: 'radial-gradient(circle at 15% 16%, rgba(2,132,199,0.24), transparent 36%), radial-gradient(circle at 86% 14%, rgba(56,189,248,0.18), transparent 33%), linear-gradient(165deg, #082f49 0%, #075985 55%, #1e1b4b 100%)',
    pattern: 'repeating-linear-gradient(90deg, rgba(186,230,253,0.08) 0 2px, transparent 2px 18px)',
    chips: ['📐', '🧮', '➗']
  },
  Trivia: {
    accentRgb: '109,40,217',
    base: 'radial-gradient(circle at 16% 14%, rgba(109,40,217,0.25), transparent 36%), radial-gradient(circle at 86% 14%, rgba(139,92,246,0.20), transparent 35%), linear-gradient(165deg, #2e1065 0%, #4c1d95 52%, #1f2937 100%)',
    pattern: 'repeating-radial-gradient(circle at 20% 20%, rgba(221,214,254,0.08) 0 4px, transparent 4px 22px)',
    chips: ['🌍', '🧭', '🏛️']
  }
};

function applyGamePageDecor(game) {
  if (!game || !game.category) return;
  const theme = GAME_PAGE_THEMES[game.category];
  if (!theme) return;

  document.body.classList.add('mgp-themed-page');
  document.documentElement.style.setProperty('--mgp-game-base', theme.base);
  document.documentElement.style.setProperty('--mgp-game-pattern', theme.pattern);
  document.documentElement.style.setProperty('--mgp-accent-rgb', theme.accentRgb);

  let bg = document.getElementById('mgp-game-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'mgp-game-bg';
    document.body.insertAdjacentElement('afterbegin', bg);
  }

  let chips = document.getElementById('mgp-game-chips');
  if (!chips) {
    chips = document.createElement('div');
    chips.id = 'mgp-game-chips';
    chips.setAttribute('aria-hidden', 'true');
    document.body.appendChild(chips);
  }
  chips.innerHTML = `
    <div class="mgp-chip chip-a">${theme.chips[0] || getCategoryIcon(game.category)}</div>
    <div class="mgp-chip chip-b">${theme.chips[1] || game.icon || '🎮'}</div>
    <div class="mgp-chip chip-c">${theme.chips[2] || game.icon || '🎮'}</div>
  `;

  let style = document.getElementById('mgp-game-decor-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'mgp-game-decor-style';
    document.head.appendChild(style);
  }

  style.textContent = `
    body.mgp-themed-page { background: #0f172a !important; }
    #mgp-game-bg {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: var(--mgp-game-base);
    }
    #mgp-game-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--mgp-game-pattern);
      opacity: 0.95;
    }
    body.mgp-themed-page > *:not(#mgp-game-bg):not(#mgp-game-chips) {
      position: relative;
      z-index: 1;
    }
    body.mgp-themed-page main {
      max-width: min(1120px, 96vw) !important;
    }
    body.mgp-themed-page main > *:not(#related-games) {
      background: rgba(255, 255, 255, 0.90) !important;
      border: 2px solid rgba(var(--mgp-accent-rgb), 0.34) !important;
      box-shadow: 0 20px 55px -22px rgba(0, 0, 0, 0.55), 0 10px 30px -24px rgba(var(--mgp-accent-rgb), 0.92) !important;
      backdrop-filter: blur(4px);
    }
    body.mgp-themed-page canvas {
      border: 2px solid rgba(var(--mgp-accent-rgb), 0.55) !important;
      box-shadow: 0 16px 40px -25px rgba(var(--mgp-accent-rgb), 0.95) !important;
      border-radius: 14px !important;
    }
    body.mgp-themed-page #related-games > section {
      background: rgba(255,255,255,0.80);
      border: 2px solid rgba(var(--mgp-accent-rgb), 0.30);
      border-radius: 20px;
      box-shadow: 0 16px 44px -28px rgba(0,0,0,0.45);
      backdrop-filter: blur(4px);
    }
    #mgp-game-chips {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
    }
    .mgp-chip {
      position: absolute;
      width: clamp(44px, 7vw, 72px);
      height: clamp(44px, 7vw, 72px);
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(1.1rem, 2.5vw, 2rem);
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.28);
      box-shadow: 0 8px 24px rgba(0,0,0,0.22);
      backdrop-filter: blur(3px);
      animation: mgpFloat 10s ease-in-out infinite;
    }
    .chip-a { top: 108px; left: clamp(6px, 2vw, 24px); animation-delay: 0s; }
    .chip-b { top: 26vh; right: clamp(6px, 2vw, 24px); animation-delay: 1.5s; }
    .chip-c { bottom: 9vh; left: clamp(8px, 4vw, 64px); animation-delay: 3s; }
    @keyframes mgpFloat {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @media (max-width: 900px) {
      .mgp-chip { opacity: 0.64; }
      .chip-a { top: 94px; left: 6px; }
      .chip-b { right: 6px; top: 24vh; }
      .chip-c { left: 10px; bottom: 12vh; }
    }
  `;
}

// ─── NAV ────────────────────────────────────────────────────────

function renderNav(gameName) {
  const el = document.getElementById('nav-container');
  if (!el) return;

  el.innerHTML = `
    <nav style="position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:2px solid #0F172A;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;max-width:100%;">
      <a href="/" style="display:flex;align-items:center;text-decoration:none;">
        <img src="/images/logo.png" alt="Mini Game Planet" style="height:36px;width:auto;">
      </a>
      <div style="display:flex;align-items:center;gap:18px;">
        <a href="/blog" style="font-size:14px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Blog</a>
        <a href="/about" style="font-size:14px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">About</a>
        <a href="/privacy" style="font-size:14px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Privacy</a>
        <button id="sound-toggle-nav" style="background:#0F172A;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;">
          <span id="sound-icon-nav">🔊</span> Sound
        </button>
      </div>
    </nav>
  `;

  const btn = document.getElementById('sound-toggle-nav');
  const icon = document.getElementById('sound-icon-nav');
  if (btn) {
    btn.addEventListener('click', () => {
      initAudio();
      const nowMuted = muteAll();
      icon.textContent = nowMuted ? '🔇' : '🔊';
    });
    if (isMuted()) icon.textContent = '🔇';
  }
}

// ─── FOOTER ─────────────────────────────────────────────────────

function renderFooter() {
  const el = document.getElementById('footer-container');
  if (!el) return;

  el.innerHTML = `
    <footer style="border-top:2px solid #0F172A;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;max-width:100%;">
      <div style="display:flex;align-items:center;gap:8px;font-size:14px;color:#64748B;">
        <img src="/images/logo.png" alt="" style="height:20px;width:auto;">
        <span>&copy; 2026 Jagan Worldwide Games. All rights reserved.</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <a href="/blog" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Blog</a>
        <a href="/about" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">About</a>
        <a href="/privacy" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Privacy</a>
        <a href="/terms" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Terms</a>
        <a href="/cookies" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Cookies</a>
        <a href="/licenses" style="font-size:13px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Licenses</a>
        <button id="footer-cookie-settings" style="font-size:13px;color:#94A3B8;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Cookie Settings</button>
      </div>
    </footer>
  `;

  const cookieBtn = document.getElementById('footer-cookie-settings');
  if (cookieBtn) {
    cookieBtn.addEventListener('click', () => openConsentBanner());
  }
}

// ─── RELATED GAMES — Full-Bleed Color Tiles ─────────────────────

function renderRelatedGames(currentSlug, category) {
  const el = document.getElementById('related-games');
  if (!el) return;

  const builtGames = games.filter(g => g.built && g.category === category && g.slug !== currentSlug);
  let related = [];

  if (builtGames.length >= 4) {
    const shuffled = shuffleArray([...builtGames]);
    related = shuffled.slice(0, 4);
  } else {
    related = [...builtGames];
    const others = games.filter(g => g.built && g.category !== category && g.slug !== currentSlug);
    const shuffled = shuffleArray([...others]);
    related = related.concat(shuffled.slice(0, 4 - related.length));
  }

  if (related.length === 0) return;

  el.innerHTML = `
    <section class="max-w-5xl mx-auto px-4 py-8">
      <h3 style="font-size:18px;font-weight:700;color:#0F172A;margin-bottom:16px;">More Games You'll Love</h3>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;" class="sm:grid-cols-2 md:grid-cols-4">
        ${related.map(g => buildGameCard(g)).join('')}
      </div>
    </section>
  `;

  applyCardGrid(el);
}

function buildGameCard(g) {
  const accent = g.accent;
  return `
    <a href="/games/${g.slug}" style="text-decoration:none;display:block;">
      <div class="game-tile" style="
        position:relative;overflow:hidden;border-radius:14px;height:200px;
        background:${accent};cursor:pointer;transition:transform 0.16s ease, box-shadow 0.16s ease;
      " onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 28px ${accent}55';" onmouseout="this.style.transform='';this.style.boxShadow='';">
        <div style="position:absolute;bottom:-10px;right:-10px;font-size:140px;opacity:0.1;transform:rotate(-12deg);line-height:1;transition:opacity 0.2s,transform 0.2s;" class="tile-bg-emoji">${g.icon}</div>
        <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%);pointer-events:none;"></div>
        <div style="position:absolute;bottom:14px;left:14px;right:14px;z-index:1;">
          <div style="font-size:40px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));margin-bottom:6px;">${g.icon}</div>
          <div style="color:#fff;font-weight:700;font-size:18px;text-shadow:0 1px 3px rgba(0,0,0,0.3);line-height:1.2;">${g.name}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
            <span style="color:rgba(255,255,255,0.8);font-size:13px;">${g.category}</span>
            <span class="tile-play-cta" style="color:#fff;font-size:13px;font-weight:900;opacity:0;transform:translateX(-8px);transition:opacity 0.15s,transform 0.15s;">PLAY →</span>
          </div>
        </div>
      </div>
    </a>
  `;
}

function applyCardGrid(container) {
  const style = document.createElement('style');
  style.textContent = `
    @media(min-width:640px){#related-games .sm\\:grid-cols-2{grid-template-columns:repeat(2,1fr);}}
    @media(min-width:768px){#related-games .md\\:grid-cols-4{grid-template-columns:repeat(4,1fr);}}
    .game-tile:hover .tile-play-cta{opacity:1!important;transform:translateX(0)!important;}
    .game-tile:hover .tile-bg-emoji{opacity:0.18!important;transform:rotate(-8deg) scale(1.05)!important;}
  `;
  if (!document.getElementById('tile-hover-styles')) {
    style.id = 'tile-hover-styles';
    document.head.appendChild(style);
  }
}

// ─── UTILITY ────────────────────────────────────────────────────

function shuffleArray(arr) {
  const rand = new Uint32Array(arr.length);
  crypto.getRandomValues(rand);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── MASTER INIT ────────────────────────────────────────────────

export function initToolPage(slug) {
  const game = games.find(g => g.slug === slug);
  const gameName = game ? game.name : '';
  const category = game ? game.category : '';

  renderNav(gameName);
  renderFooter();
  renderRelatedGames(slug, category);

  if (!document.getElementById('tile-hover-styles')) {
    const style = document.createElement('style');
    style.id = 'tile-hover-styles';
    style.textContent = `
      .game-tile:hover .tile-play-cta{opacity:1!important;transform:translateX(0)!important;}
      .game-tile:hover .tile-bg-emoji{opacity:0.18!important;transform:rotate(-8deg) scale(1.05)!important;}
    `;
    document.head.appendChild(style);
  }

  if (game) {
    applyGamePageDecor(game);
  }
}

export { renderNav, renderFooter, renderRelatedGames, buildGameCard, games, categories, getCategoryAccent, getCategoryIcon, shuffleArray };
