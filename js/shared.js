// MiniGamePlanet — Shared UI Chrome (Nav, Footer, Related Games)
// Renders Design System-compliant nav, footer, and related game tiles.

import { games, categories } from '/data/games.js';
import MGP from '/js/mgp-core.js';
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
  upsertLink({ rel: 'manifest', href: '/manifest.json' });
}

// updateViewportHeightVar removed — sizing now uses 100dvh in CSS

function dispatchVirtualKey(code, key) {
  const event = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
}

function getPrimaryCanvas() {
  return document.querySelector('.mgp-game-area canvas, main canvas, canvas');
}

function markGameShell() {
  const main = document.querySelector('main');
  if (!main) return null;
  const candidates = Array.from(main.children).filter(el => el instanceof HTMLElement);
  const shell = candidates.find((el) => el.querySelector('canvas, #gameCanvas, #game-canvas, #gameWrapper, #game-wrap, #game-area, #battle-area, #bet-phase, #play-phase, #board, #sudoku-grid')) || null;
  if (!shell) return null;
  const hasCanvas = !!shell.querySelector('canvas');
  shell.classList.add('mgp-legacy-game-shell');
  shell.classList.toggle('mgp-legacy-game-shell-canvas', hasCanvas);
  shell.classList.toggle('mgp-legacy-game-shell-dom', !hasCanvas);
  return shell;
}

function ensureOverlayHost(el) {
  if (!(el instanceof HTMLElement)) return null;
  if (getComputedStyle(el).position === 'static') {
    el.style.position = 'relative';
  }
  el.classList.add('mgp-overlay-host');
  return el;
}

function getControlsOverlayHost() {
  const coreHost = document.querySelector('.mgp-game-area');
  if (coreHost instanceof HTMLElement) return ensureOverlayHost(coreHost);
  const canvas = getPrimaryCanvas();
  const legacyShell = markGameShell();
  const explicitHost = canvas?.closest('#gameWrapper, #game-wrap, .relative, .touch-zone');
  return ensureOverlayHost(explicitHost || legacyShell || canvas?.parentElement || null);
}

function addMobileKeyboardFallback() {
  if (document.getElementById('mobile-controls')) return;
  const canvas = getPrimaryCanvas();
  if (!canvas) return;
  const existingTouchUi = document.querySelector('#touchControls, #touchOverlay, #touchLeft, #touchRight, .touch-btn, [data-action], [data-key]');
  if (existingTouchUi) return;

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
    <div class="mobile-controls-cluster mobile-controls-cluster--move">
      <button class="mobile-control-btn" data-code="ArrowUp" data-key="ArrowUp" aria-label="Up">▲</button>
      <div class="mobile-controls-row">
        <button class="mobile-control-btn" data-code="ArrowLeft" data-key="ArrowLeft" aria-label="Left">◀</button>
        <button class="mobile-control-btn" data-code="ArrowDown" data-key="ArrowDown" aria-label="Down">▼</button>
        <button class="mobile-control-btn" data-code="ArrowRight" data-key="ArrowRight" aria-label="Right">▶</button>
      </div>
    </div>
    <div class="mobile-controls-cluster mobile-controls-cluster--actions">
      <button class="mobile-control-btn mobile-control-btn--action" data-code="Space" data-key=" " aria-label="Action">◎</button>
    </div>
  `;

  const host = getControlsOverlayHost();
  if (!host) return;
  host.appendChild(controls);

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
    html, body { max-width: 100%; overflow-x: hidden; }
    body { min-height: 100vh; min-height: 100dvh; }
    canvas, svg, img, video { max-width: 100%; height: auto; }
    canvas { touch-action: none; }
    input, textarea, select, button { font-size: 16px; }
    .mgp-overlay-host { position: relative; }
    .mgp-controls-hint-overlay {
      position: absolute;
      left: 50%;
      bottom: 12px;
      transform: translate(-50%, 12px);
      opacity: 0;
      pointer-events: none;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.78);
      color: #E2E8F0;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.28);
      backdrop-filter: blur(10px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 24;
    }
    .mgp-controls-hint-overlay.is-visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .mgp-controls-hint-overlay.is-hidden {
      opacity: 0;
      transform: translate(-50%, 12px);
    }
    @media (hover:hover) and (pointer:fine) {
      .mobile-controls,
      #touchControls,
      #touchOverlay,
      .touch-btn,
      #touchLeft,
      #touchRight {
        display: none;
      }
    }
    @media (pointer: coarse) {
      button, [role="button"], .cat-pill, .speed-btn, a {
        min-height: 42px;
      }
      .mgp-controls-hint-overlay {
        display: none;
      }
      #nav-container nav {
        padding: 8px 12px;
        min-height: 56px;
        height: auto;
        flex-wrap: wrap;
        gap: 8px;
      }
      #nav-container nav > div {
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      #nav-container nav a, #nav-container nav button {
        font-size: 13px;
      }
      .mobile-controls {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 14px;
        pointer-events: none;
        z-index: 22;
      }
      .mobile-controls-cluster {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
      }
      .mobile-controls-row {
        display: flex;
        gap: 10px;
      }
      .mobile-control-btn,
      .touch-btn {
        width: 56px;
        height: 56px;
        min-width: 48px;
        min-height: 48px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(15, 23, 42, 0.52);
        color: #F8FAFC;
        font-size: 24px;
        font-weight: 700;
        font-family: inherit;
        box-shadow: 0 12px 30px rgba(2, 8, 23, 0.28);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: 0.66;
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
      }
      .mobile-control-btn--action,
      #touchControls .touch-btn[data-key=" "],
      #touchControls .touch-btn[data-key="Space"],
      .touch-btn#btn-up,
      .touch-btn#btn-hold {
        background: rgba(var(--mgp-accent-rgb, 59, 130, 246), 0.6);
        border-color: rgba(var(--mgp-accent-rgb, 59, 130, 246), 0.72);
      }
      .mobile-control-btn:active,
      .touch-btn:active {
        opacity: 0.9;
        transform: scale(0.96);
        background: rgba(var(--mgp-accent-rgb, 59, 130, 246), 0.72);
      }
      #touchControls {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        opacity: 1;
        pointer-events: none;
        z-index: 22;
      }
      #touchControls > *,
      #touchControls button {
        pointer-events: auto;
      }
      #touchControls .touch-btn {
        font-size: 0;
      }
      #touchControls .touch-btn::before {
        font-size: 20px;
        line-height: 1;
      }
      #touchControls .touch-btn[data-key="ArrowLeft"]::before { content: '◀'; }
      #touchControls .touch-btn[data-key="ArrowRight"]::before { content: '▶'; }
      #touchControls .touch-btn[data-key=" "]::before { content: '◎'; font-size: 24px; }
      #touchControls .touch-btn[data-key="Space"]::before { content: '●'; font-size: 18px; }
      .mgp-legacy-game-shell-canvas > div:has(.touch-btn):not(#touchControls) {
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 12px;
        margin: 0;
        justify-content: center;
        z-index: 22;
      }
      #touchOverlay {
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: none;
        z-index: 21;
      }
      #touchLeft,
      #touchRight {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 50%;
        pointer-events: auto;
      }
      #touchLeft { left: 0; }
      #touchRight { right: 0; }
      #touchLeft::after,
      #touchRight::after {
        position: absolute;
        bottom: 12px;
        width: 56px;
        height: 56px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(15, 23, 42, 0.52);
        border: 1px solid rgba(255, 255, 255, 0.22);
        color: #F8FAFC;
        font-size: 24px;
        font-weight: 700;
        box-shadow: 0 12px 30px rgba(2, 8, 23, 0.28);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: 0.66;
      }
      #touchLeft::after {
        content: '◀';
        left: 12px;
      }
      #touchRight::after {
        content: '▶';
        right: 12px;
      }
    }
  `;
  document.head.appendChild(style);

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
    bg: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 30%, #0e7490 60%, #155e75 100%)',
    vibe: ['🕹️','⚡','👾','🚀','💫','🎮','🌟','🔥']
  },
  Puzzle: {
    accentRgb: '37,99,235',
    bg: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 30%, #3b82f6 60%, #1d4ed8 100%)',
    vibe: ['🧩','🧠','💡','🔍','✨','🎯','🔢','⭐']
  },
  Card: {
    accentRgb: '220,38,38',
    bg: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 30%, #b91c1c 60%, #450a0a 100%)',
    vibe: ['🃏','♠️','♥️','♦️','♣️','👑','🂡','✨']
  },
  Word: {
    accentRgb: '217,119,6',
    bg: 'linear-gradient(135deg, #78350f 0%, #92400e 30%, #b45309 60%, #451a03 100%)',
    vibe: ['📝','🔤','✏️','📖','💬','🅰️','📚','✨']
  },
  Strategy: {
    accentRgb: '13,148,136',
    bg: 'linear-gradient(135deg, #134e4a 0%, #115e59 30%, #0f766e 60%, #042f2e 100%)',
    vibe: ['♟️','🏆','⚔️','🧠','🎖️','👑','🛡️','⭐']
  },
  Casino: {
    accentRgb: '5,150,105',
    bg: 'linear-gradient(135deg, #14532d 0%, #166534 30%, #15803d 60%, #052e16 100%)',
    vibe: ['🎰','🪙','💰','🎲','♦️','💎','🤑','✨']
  },
  Casual: {
    accentRgb: '225,29,72',
    bg: 'linear-gradient(135deg, #881337 0%, #9f1239 30%, #be123c 60%, #4c0519 100%)',
    vibe: ['🎯','🌈','✨','⭐','🎉','🎪','💫','🎈']
  },
  Action: {
    accentRgb: '234,88,12',
    bg: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 30%, #c2410c 60%, #431407 100%)',
    vibe: ['🔥','💥','⚡','🚀','💪','🎯','⭐','🏃']
  },
  Board: {
    accentRgb: '79,70,229',
    bg: 'linear-gradient(135deg, #3730a3 0%, #4338ca 30%, #4f46e5 60%, #1e1b4b 100%)',
    vibe: ['🎲','🏁','🎪','⭐','🧩','🏆','✨','🎯']
  },
  Builder: {
    accentRgb: '8,145,178',
    bg: 'linear-gradient(135deg, #155e75 0%, #0e7490 30%, #0891b2 60%, #083344 100%)',
    vibe: ['🏗️','🔧','🎨','✨','🔨','💡','🖌️','⭐']
  },
  Math: {
    accentRgb: '2,132,199',
    bg: 'linear-gradient(135deg, #075985 0%, #0369a1 30%, #0284c7 60%, #0c4a6e 100%)',
    vibe: ['📐','🧮','➕','✨','🔢','💡','🧠','⭐']
  },
  Trivia: {
    accentRgb: '109,40,217',
    bg: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 30%, #6d28d9 60%, #2e1065 100%)',
    vibe: ['🌍','🧭','🏛️','✨','📚','🎓','💡','⭐']
  }
};

function applyGamePageDecor(game) {
  if (!game || !game.category) return;
  const theme = GAME_PAGE_THEMES[game.category];
  if (!theme) return;

  const gameEmoji = game.icon || '🎮';
  const vibeEmojis = theme.vibe;

  document.body.classList.add('mgp-themed-page');
  document.documentElement.style.setProperty('--mgp-accent-rgb', theme.accentRgb);
  document.documentElement.style.setProperty('--mgp-theme-bg', theme.bg);
  markGameShell();
  document.getElementById('mgp-game-bg')?.remove();
  document.getElementById('mgp-emoji-scatter')?.remove();

  const oldBanner = document.getElementById('mgp-emoji-banner');
  if (oldBanner) oldBanner.remove();
  const oldHeaderEmojis = document.getElementById('mgp-header-emojis');
  if (oldHeaderEmojis) oldHeaderEmojis.remove();
  const oldFooterEmojis = document.getElementById('mgp-footer-emojis');
  if (oldFooterEmojis) oldFooterEmojis.remove();

  const bannerEmojis = [gameEmoji, ...vibeEmojis.slice(0,5), gameEmoji];
  window._mgpBannerEmojis = bannerEmojis;

  let style = document.getElementById('mgp-game-decor-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'mgp-game-decor-style';
    document.head.appendChild(style);
  }

  const C = `var(--mgp-accent-rgb)`;
  const CONTENT = `
    body.mgp-themed-page main > div,
    body.mgp-themed-page main > article,
    body.mgp-themed-page main > section,
    body.mgp-themed-page main > .card,
    body.mgp-themed-page main.bg-white,
    body.mgp-themed-page main.rounded-2xl,
    body.mgp-themed-page > div:not(#nav-container):not(#footer-container):not(#related-games):not(#mgp-game-bg):not(#mgp-emoji-scatter) > main,
    body.mgp-themed-page > div:not(#nav-container):not(#footer-container):not(#related-games):not(#mgp-game-bg):not(#mgp-emoji-scatter) > main > div,
    body.mgp-themed-page > div:not(#nav-container):not(#footer-container):not(#related-games):not(#mgp-game-bg):not(#mgp-emoji-scatter) > main > article,
    body.mgp-themed-page > article,
    body.mgp-themed-page > section:not(#nav-container):not(#footer-container):not(#related-games),
    body.mgp-themed-page > div.max-w-3xl,
    body.mgp-themed-page > div.max-w-2xl,
    body.mgp-themed-page > div.max-w-4xl,
    body.mgp-themed-page main ~ article,
    body.mgp-themed-page main ~ section:not(#related-games),
    body.mgp-themed-page main ~ div:not(#related-games):not(#footer-container):not(#nav-container):not(#mgp-game-bg):not(#mgp-emoji-scatter)`;
  style.textContent = `
    /* ── Animated emojis beside player name ── */
    .mgp-name-emojis {
      display: inline-flex;
      align-items: center;
      gap: clamp(3px, 0.8vw, 6px);
      pointer-events: none;
      vertical-align: middle;
    }
    .mgp-banner-e {
      font-size: clamp(1.2rem, 2.8vw, 1.8rem);
      animation: mgpPop 2s ease-in-out infinite;
      display: inline-block;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
      line-height: 1;
    }
    .mgp-banner-e:nth-child(1) { animation-delay: 0s; }
    .mgp-banner-e:nth-child(2) { animation-delay: 0.15s; }
    .mgp-banner-e:nth-child(3) { animation-delay: 0.3s; }
    .mgp-banner-e:nth-child(4) { animation-delay: 0.45s; }
    .mgp-banner-e:nth-child(5) { animation-delay: 0.6s; }
    .mgp-banner-e:nth-child(6) { animation-delay: 0.75s; }
    .mgp-banner-e:nth-child(7) { animation-delay: 0.9s; }
    @keyframes mgpPop {
      0%, 100% { transform: scale(1) translateY(0); }
      50% { transform: scale(1.15) translateY(-4px); }
    }

    /* ── Overflow protection ── */
    body.mgp-themed-page,
    body.mgp-themed-page main,
    body.mgp-themed-page main > div,
    body.mgp-themed-page main > article,
    body.mgp-themed-page > article {
      overflow-x: hidden;
      max-width: 100vw;
    }
    body.mgp-themed-page *, body.mgp-themed-page *::before, body.mgp-themed-page *::after {
      box-sizing: border-box;
    }

    body.mgp-themed-page main {
      max-width: min(100%, 960px);
      width: 100%;
      padding: 12px;
      margin: 0 auto;
    }
    body.mgp-themed-page main > div:first-child,
    body.mgp-themed-page main > .card:first-child,
    body.mgp-themed-page main > article:first-child {
      max-width: 100%;
      width: 100%;
      overflow-x: auto;
    }

    /* ── FORCE STACKED LAYOUT: Never side-by-side game + article ── */
    body.mgp-themed-page .flex-row,
    body.mgp-themed-page .md\\:flex-row,
    body.mgp-themed-page [class*="md:flex-row"],
    body.mgp-themed-page main .flex.flex-col.md\\:flex-row,
    body.mgp-themed-page main > div > div.flex {
      flex-direction: column;
      align-items: center;
    }
    body.mgp-themed-page main .flex-shrink-0,
    body.mgp-themed-page main .flex-1 {
      width: 100%;
      max-width: 100%;
    }
    body.mgp-themed-page main .inline-block,
    body.mgp-themed-page main #gameWrapper,
    body.mgp-themed-page main .touch-zone,
    body.mgp-themed-page main [style*="max-width"] {
      display: block;
      width: 100%;
      max-width: 100%;
    }
    body.mgp-themed-page main canvas {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
    }
    body.mgp-themed-page main canvas[width="420"][height="420"],
    body.mgp-themed-page main canvas[width="400"][height="400"] {
      max-width: 100%;
      height: auto;
    }

    /* Compact disclaimers - push below the game */
    body.mgp-themed-page .bg-amber-50,
    body.mgp-themed-page [style*="background:#FEF3C7"],
    body.mgp-themed-page [style*="background: #FEF3C7"] {
      order: 99;
      padding: 8px 12px;
      font-size: 12px;
      margin-top: 12px;
      margin-bottom: 0;
    }
    /* How-to-Play articles: own container below the game */
    body.mgp-themed-page > article,
    body.mgp-themed-page main ~ article,
    body.mgp-themed-page main + article,
    body.mgp-themed-page main .flex-1 article,
    body.mgp-themed-page main article {
      margin-top: 16px;
      padding: 20px;
      font-size: 14px;
      background: #fff;
      border-radius: 16px;
      border: 2px solid rgba(${C}, 0.2);
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    body.mgp-themed-page > article h2,
    body.mgp-themed-page main ~ article h2,
    body.mgp-themed-page main article h2 {
      font-size: 18px;
      margin-bottom: 8px;
      color: #0F172A;
    }

    /* ── CARD GAMES: Centering + wrapping for card hands ── */
    body.mgp-themed-page #dealer-hand,
    body.mgp-themed-page #player-hand,
    body.mgp-themed-page #cpu-hand,
    body.mgp-themed-page #player-cards,
    body.mgp-themed-page #cpu-cards,
    body.mgp-themed-page .hand,
    body.mgp-themed-page [id*="-hand"] {
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Blackjack PLAYING cards only (not layout .card wrappers) */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card.deal,
    body.mgp-themed-page [id*="-hand"] > .card {
      width: clamp(76px, 15vw, 120px);
      height: clamp(110px, 22vw, 172px);
      font-size: clamp(24px, 4.5vw, 38px);
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 15px rgba(${C}, 0.15);
      margin: 0 clamp(-6px, -0.8vw, -3px);
    }
    body.mgp-themed-page .card.red > span,
    body.mgp-themed-page .card.black > span,
    body.mgp-themed-page [id*="-hand"] > .card > span {
      font-size: clamp(20px, 3.5vw, 32px);
    }
    body.mgp-themed-page .card.red > span[style*="font-size:12px"],
    body.mgp-themed-page .card.black > span[style*="font-size:12px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 12px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 12px"] {
      font-size: clamp(16px, 2.8vw, 24px);
    }
    body.mgp-themed-page .card.red > span[style*="font-size:22px"],
    body.mgp-themed-page .card.black > span[style*="font-size:22px"],
    body.mgp-themed-page .card.red > span[style*="font-size:18px"],
    body.mgp-themed-page .card.black > span[style*="font-size:18px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 22px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 22px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 18px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 18px"] {
      font-size: clamp(26px, 5vw, 42px);
    }
    body.mgp-themed-page .card.facedown::after {
      font-size: clamp(36px, 7vw, 56px);
    }
    /* All card inline span text across all games */
    body.mgp-themed-page .ce-card > span,
    body.mgp-themed-page .pile-card > span {
      font-size: clamp(16px, 2.8vw, 26px);
    }
    body.mgp-themed-page .ce-card > span[style*="font-size:18px"],
    body.mgp-themed-page .ce-card > span[style*="font-size: 18px"],
    body.mgp-themed-page .pile-card > span[style*="font-size:22px"],
    body.mgp-themed-page .pile-card > span[style*="font-size: 22px"] {
      font-size: clamp(22px, 4vw, 36px);
    }

    /* Solitaire .card-el / .slot (62x88 -> 100x142) */
    body.mgp-themed-page .card-el,
    body.mgp-themed-page .slot {
      width: clamp(60px, 12vw, 100px);
      height: clamp(86px, 17vw, 142px);
      border-radius: 10px;
    }
    body.mgp-themed-page .card-rank { font-size: clamp(14px, 2.4vw, 20px); }
    body.mgp-themed-page .card-suit { font-size: clamp(18px, 3.2vw, 28px); }

    /* Spider Solitaire .card-s (58x82 -> 96x136) */
    body.mgp-themed-page .card-s {
      width: clamp(56px, 11vw, 96px);
      height: clamp(80px, 16vw, 136px);
      border-radius: 10px;
    }
    body.mgp-themed-page .card-s .r { font-size: clamp(12px, 2vw, 18px); }
    body.mgp-themed-page .card-s .st { font-size: clamp(16px, 2.8vw, 24px); }

    /* FreeCell .card-f / .slot-f (60x84 -> 98x138) */
    body.mgp-themed-page .card-f,
    body.mgp-themed-page .slot-f {
      width: clamp(58px, 11.5vw, 98px);
      height: clamp(82px, 16.5vw, 138px);
      border-radius: 10px;
    }
    body.mgp-themed-page .card-f .rk { font-size: clamp(12px, 2vw, 18px); }
    body.mgp-themed-page .card-f .su { font-size: clamp(16px, 2.8vw, 24px); }

    /* Crazy Eights .ce-card (56x80 -> 90x128) */
    body.mgp-themed-page .ce-card {
      width: clamp(54px, 11vw, 90px);
      height: clamp(76px, 15.5vw, 128px);
      border-radius: 10px;
    }
    body.mgp-themed-page .pile-card,
    body.mgp-themed-page #draw-pile {
      width: clamp(62px, 12.5vw, 105px);
      height: clamp(88px, 17.5vw, 148px);
      border-radius: 10px;
    }
    body.mgp-themed-page .suit-btn {
      width: clamp(40px, 7vw, 56px);
      height: clamp(40px, 7vw, 56px);
      font-size: clamp(20px, 3.5vw, 30px);
    }

    /* War .wc (72x104 -> 125x180) */
    body.mgp-themed-page .wc {
      width: clamp(76px, 15vw, 125px);
      height: clamp(110px, 22vw, 180px);
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    body.mgp-themed-page .wc .rk { font-size: clamp(16px, 3vw, 24px); }
    body.mgp-themed-page .wc .st { font-size: clamp(28px, 5vw, 42px); }

    /* Go Fish .gf-card (52x74 -> 82x116) */
    body.mgp-themed-page .gf-card {
      width: clamp(50px, 10vw, 82px);
      height: clamp(70px, 14vw, 116px);
      font-size: clamp(13px, 2.2vw, 18px);
      border-radius: 10px;
    }
    body.mgp-themed-page .gf-back {
      width: clamp(42px, 7.5vw, 64px);
      height: clamp(58px, 10.5vw, 88px);
      border-radius: 8px;
    }

    /* Video Poker .vp-card (72x104 -> 110x158) */
    body.mgp-themed-page .vp-card {
      width: clamp(68px, 13vw, 110px);
      height: clamp(98px, 19vw, 158px);
      border-radius: 12px;
    }
    body.mgp-themed-page .vp-card .rank { font-size: clamp(14px, 2.5vw, 22px); }
    body.mgp-themed-page .vp-card .suit { font-size: clamp(22px, 4vw, 34px); }

    /* High-Low .hl-card (80x116 -> 120x174) */
    body.mgp-themed-page .hl-card {
      width: clamp(76px, 14vw, 120px);
      height: clamp(110px, 21vw, 174px);
      border-radius: 12px;
    }
    body.mgp-themed-page .hl-card .rk { font-size: clamp(18px, 3vw, 28px); }
    body.mgp-themed-page .hl-card .st { font-size: clamp(28px, 5vw, 42px); }

    /* Dominoes .domino-tile */
    body.mgp-themed-page .domino-tile {
      width: clamp(44px, 7vw, 60px);
      height: clamp(88px, 14vw, 120px);
    }

    /* ── DISCLAIMER / ENTERTAINMENT BOXES (box styling only, text in Layer 3) ── */
    body.mgp-themed-page [style*="background:#FEF3C7"],
    body.mgp-themed-page [style*="background: #FEF3C7"],
    body.mgp-themed-page .bg-amber-50 {
      background: #FEF3C7;
      border: 2px solid #FCD34D;
      border-radius: 12px;
      padding: 14px 18px;
    }

    /* ── ALL GAME BUTTONS: Bigger + exciting ── */
    body.mgp-themed-page .action-btn,
    body.mgp-themed-page .bet-btn,
    body.mgp-themed-page .btn-f,
    body.mgp-themed-page .guess-btn,
    body.mgp-themed-page .mode-btn {
      padding: clamp(12px, 2vw, 20px) clamp(24px, 4vw, 48px);
      font-size: clamp(15px, 2.2vw, 20px);
      font-weight: 700;
      border-radius: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    

    /* ── BOARD GAMES: Bigger boards ── */
    body.mgp-themed-page #chess-board {
      max-width: min(92vw, 600px); width: min(92vw, 600px);
    }
    body.mgp-themed-page .chess-piece {
      font-size: clamp(2rem, 6vw, 4.5rem);
    }
    body.mgp-themed-page #board[class*="w-72"],
    body.mgp-themed-page #board[class*="w-80"] {
      width: min(92vw, 520px); height: min(92vw, 520px);
    }
    body.mgp-themed-page [class*="text-4xl"][class*="md\\:text-5xl"] {
      font-size: clamp(2.5rem, 6vw, 4rem);
    }
    body.mgp-themed-page [class*="w-\\[min(90vw"] {
      max-width: min(92vw, 600px); width: min(92vw, 600px);
    }

    /* ── PUZZLE GAMES: Bigger grids ── */
    body.mgp-themed-page #sudoku-grid {
      max-width: min(92vw, 560px); width: min(92vw, 560px);
    }
    body.mgp-themed-page .su-cell {
      font-size: clamp(16px, 3vw, 24px);
    }
    body.mgp-themed-page .su-note { font-size: clamp(7px, 1.2vw, 10px); }
    body.mgp-themed-page .num-btn {
      width: clamp(34px, 6vw, 48px); height: clamp(38px, 6.5vw, 52px);
      font-size: clamp(16px, 2.5vw, 22px);
    }
    body.mgp-themed-page #grid-container {
      max-width: 88vw; overflow-x: auto;
    }
    body.mgp-themed-page #board[style*="max-width:340px"],
    body.mgp-themed-page #board[style*="max-width: 340px"] {
      max-width: min(88vw, 440px);
    }

    /* ── HANGMAN: Responsive ── */
    body.mgp-themed-page .hm-letter {
      font-size: clamp(22px, 4vw, 36px); width: clamp(22px, 4vw, 36px);
    }
    body.mgp-themed-page .kb-letter {
      width: clamp(32px, 5.5vw, 44px); height: clamp(32px, 5.5vw, 44px);
      font-size: clamp(13px, 2vw, 18px);
    }
    body.mgp-themed-page #hangman-canvas {
      width: clamp(160px, 30vw, 240px); height: clamp(160px, 30vw, 240px);
    }

    /* ── MEMORY MATCH ── */
    body.mgp-themed-page .mm-card {
      min-width: 0;
    }

    /* ── BLOCK PUZZLE: Responsive ── */
    body.mgp-themed-page #gameCanvas[width="300"],
    body.mgp-themed-page canvas[width="300"][height="480"] {
      width: min(65vw, 360px); height: min(104vw, 576px);
    }
    body.mgp-themed-page #holdCanvas, body.mgp-themed-page #nextCanvas {
      width: min(18vw, 100px); height: min(18vw, 100px);
    }
    body.mgp-themed-page .touch-btn {
      width: clamp(48px, 10vw, 60px); height: clamp(48px, 10vw, 60px);
      min-width: 48px; min-height: 48px;
      font-size: clamp(18px, 3vw, 26px);
    }

    /* ── SNAKE & square canvases — handled by main canvas rules above ── */

    /* ── ALL GAMES: Bigger action buttons (not sound toggles or small toggles) ── */
    body.mgp-themed-page main button:not(#sound-toggle):not(#soundToggle):not(#sound-btn):not(.mode-btn) {
      min-height: 44px;
      font-weight: 700;
    }

    /* ── Canvas: glow only — no width/border forcing (preserves game coordinates) ── */
    body.mgp-themed-page canvas {
      max-width: 100%;
      border: none;
      box-shadow:
        0 0 0 3px rgba(${C}, 0.7),
        0 0 20px rgba(${C}, 0.6),
        0 0 60px rgba(${C}, 0.3),
        0 0 120px rgba(${C}, 0.15),
        0 16px 40px -12px rgba(0,0,0,0.6);
      border-radius: 16px;
    }
    body.mgp-themed-page #game-canvas {
      max-width: min(94vw, 1000px);
    }

    /* ── SLOT MACHINE: handled by inline styles in slot-machine.html ── */

    /* ── ROULETTE WHEEL ── */
    body.mgp-themed-page #roulette-wheel,
    body.mgp-themed-page canvas[id*="roulette"] {
      max-width: min(90vw, 500px);
    }

    /* ── Game area centering + styling ── */
    body.mgp-themed-page [style*="background:#0F4C3A"],
    body.mgp-themed-page [style*="background:#0F6B3A"],
    body.mgp-themed-page [style*="background:#0f4c3a"],
    body.mgp-themed-page [style*="background:#0f6b3a"],
    body.mgp-themed-page #game-area,
    body.mgp-themed-page #battle-area {
      border-radius: 20px;
      padding: clamp(20px, 4vw, 36px);
      text-align: center;
      box-shadow:
        inset 0 0 40px rgba(0,0,0,0.2),
        0 0 30px rgba(${C}, 0.2),
        0 12px 40px rgba(0,0,0,0.3);
      border: 2px solid rgba(255,255,255,0.1);
    }
    body.mgp-themed-page [style*="background:#0F4C3A"] > div,
    body.mgp-themed-page [style*="background:#0F6B3A"] > div,
    body.mgp-themed-page [style*="background:#0f4c3a"] > div,
    body.mgp-themed-page [style*="background:#0f6b3a"] > div,
    body.mgp-themed-page #game-area > div,
    body.mgp-themed-page #battle-area > div {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    body.mgp-themed-page [style*="display:flex"][style*="min-height"],
    body.mgp-themed-page [id$="-hand"],
    body.mgp-themed-page [id$="-cards"] {
      justify-content: center;
    }
    /* Center all game content sections */
    body.mgp-themed-page main > div > div:first-child {
      position: relative;
    }
    body.mgp-themed-page #bet-phase,
    body.mgp-themed-page #bet-preview-felt,
    body.mgp-themed-page [id*="phase"],
    body.mgp-themed-page [id*="result"],
    body.mgp-themed-page main > div > div[style*="text-align:center"],
    body.mgp-themed-page main > article > div[style*="text-align:center"] {
      text-align: center;
      margin-left: auto;
      margin-right: auto;
    }
    /* Center flex containers with buttons/chips */
    body.mgp-themed-page main > div div[style*="display:flex"][style*="justify-content:center"],
    body.mgp-themed-page main > article div[style*="display:flex"][style*="justify-content:center"] {
      justify-content: center;
      align-items: center;
    }
    /* Center all canvases */
    body.mgp-themed-page main canvas {
      display: block;
      margin-left: auto;
      margin-right: auto;
    }

    /* ── ANIMATIONS: Playing cards, buttons, cells ── */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card-f,
    body.mgp-themed-page .ce-card,
    body.mgp-themed-page .pile-card,
    body.mgp-themed-page .wc,
    body.mgp-themed-page .gf-card,
    body.mgp-themed-page .vp-card,
    body.mgp-themed-page .hl-card,
    body.mgp-themed-page .mm-card,
    body.mgp-themed-page .slot,
    body.mgp-themed-page .slot-f {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }
    body.mgp-themed-page .card.red:hover,
    body.mgp-themed-page .card.black:hover,
    body.mgp-themed-page .card.facedown:hover,
    body.mgp-themed-page .card-f:hover,
    body.mgp-themed-page .ce-card:hover,
    body.mgp-themed-page .gf-card:hover,
    body.mgp-themed-page .vp-card:hover,
    body.mgp-themed-page .hl-card:hover,
    body.mgp-themed-page .mm-card:hover {
      transform: translateY(-8px) scale(1.08);
      box-shadow: 0 16px 32px -4px rgba(0,0,0,0.35);
      z-index: 10;
    }
    body.mgp-themed-page .su-cell,
    body.mgp-themed-page .cell,
    body.mgp-themed-page .chess-square,
    body.mgp-themed-page .kb-letter,
    body.mgp-themed-page .num-btn,
    body.mgp-themed-page .suit-btn {
      transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
    }
    body.mgp-themed-page .su-cell:hover,
    body.mgp-themed-page .cell:hover,
    body.mgp-themed-page .chess-square:hover {
      transform: scale(1.08);
      box-shadow: 0 0 12px rgba(${C}, 0.4);
      z-index: 5;
    }
    body.mgp-themed-page .kb-letter:hover,
    body.mgp-themed-page .num-btn:hover,
    body.mgp-themed-page .suit-btn:hover {
      transform: scale(1.12);
      box-shadow: 0 4px 16px rgba(${C}, 0.4);
    }
    body.mgp-themed-page .kb-letter:active,
    body.mgp-themed-page .num-btn:active,
    body.mgp-themed-page .suit-btn:active,
    body.mgp-themed-page .su-cell:active,
    body.mgp-themed-page .cell:active {
      transform: scale(0.92);
    }

    /* ── Primary buttons get a pulse glow ── */
    body.mgp-themed-page #deal-btn:not([disabled]),
    body.mgp-themed-page #spin-btn,
    body.mgp-themed-page #btn-deal:not([disabled]),
    body.mgp-themed-page #btn-restart,
    body.mgp-themed-page #btn-newhand,
    body.mgp-themed-page #restartBtn,
    body.mgp-themed-page button[id*="start"],
    body.mgp-themed-page button[id*="play"],
    body.mgp-themed-page button[id*="deal"],
    body.mgp-themed-page button[id*="spin"] {
      animation: mgpBtnPulse 2s ease-in-out infinite;
    }
    @keyframes mgpBtnPulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(${C}, 0.3); }
      50% { box-shadow: 0 4px 16px rgba(${C}, 0.3), 0 0 30px rgba(${C}, 0.4); }
    }

    /* ── Widen articles outside main ── */
    body.mgp-themed-page > article,
    body.mgp-themed-page main ~ article {
      width: 100%;
      max-width: min(100%, 960px);
      margin-left: auto;
      margin-right: auto;
      overflow-x: hidden;
    }

    /* ── Wrapper divs around main should be transparent, not cards ── */
    body.mgp-themed-page > div:not(#nav-container):not(#footer-container):not(#related-games):not(#mgp-game-bg):not(#mgp-emoji-scatter) {
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
      max-width: 100%;
    }

    /* ── Content cards ── */
    ${CONTENT} {
      background: #ffffff;
      color: #0F172A;
      border: 2px solid rgba(${C}, 0.5);
      border-radius: 20px;
      box-shadow:
        0 0 30px -5px rgba(${C}, 0.4),
        0 0 80px -15px rgba(${C}, 0.25),
        0 20px 60px -15px rgba(0,0,0,0.5),
        0 0 0 1px rgba(255,255,255,0.15);
      padding: 16px;
      margin-bottom: 12px;
      overflow-x: auto;
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #gameWrapper,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #game-wrap,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #game-area,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root .touch-zone,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root .relative:has(canvas) {
      background: rgba(15, 23, 42, 0.84);
      color: #E2E8F0;
      border: 1px solid rgba(${C}, 0.2);
      box-shadow: 0 18px 40px rgba(2,8,23,0.3);
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #soundToggle,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #sound-toggle,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root #sound-btn {
      display: none;
    }
    /* ── LAYER 1: Force dark readable text on ALL content areas ── */
    ${CONTENT} {
      color: #0F172A;
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root p,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root span,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root div,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root label,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root strong,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root li,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root h1,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root h2,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root h3,
    body.mgp-arcade-core-page #mgp-arcade-legacy-root h4 {
      color: #E2E8F0;
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="text-gray-500"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="text-gray-600"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="text-slate-600"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="text-gray-700"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="text-slate-700"] {
      color: #CBD5E1;
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="bg-gray-50"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="bg-gray-100"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="bg-indigo-100"],
    body.mgp-arcade-core-page #mgp-arcade-legacy-root [class*="bg-amber-100"] {
      background: rgba(30, 41, 59, 0.9);
      color: #E2E8F0;
    }
    body.mgp-arcade-core-page #mgp-arcade-legacy-root a {
      color: rgb(${C});
    }
    body.mgp-themed-page main p:not([class*="text-white"]),
    body.mgp-themed-page main div:not([style*="background:#"]):not([style*="background:linear"]):not([style*="background:radial"]):not(#mgp-header-emojis):not(#mgp-footer-emojis):not([class*="bg-black"]):not([class*="bg-gray-9"]):not([class*="bg-slate-9"]),
    body.mgp-themed-page main span:not([style*="color:"]):not(.mgp-banner-e):not(.mgp-scatter-emoji):not([class*="text-white"]),
    body.mgp-themed-page main label:not([class*="text-white"]),
    body.mgp-themed-page main strong:not([class*="text-white"]),
    body.mgp-themed-page main em,
    body.mgp-themed-page main b,
    body.mgp-themed-page main h1:not([class*="text-white"]),
    body.mgp-themed-page main h2:not([class*="text-white"]),
    body.mgp-themed-page main h3:not([class*="text-white"]),
    body.mgp-themed-page main h4,
    body.mgp-themed-page main td,
    body.mgp-themed-page main th,
    body.mgp-themed-page main select,
    body.mgp-themed-page main input,
    body.mgp-themed-page > article p:not([class*="text-white"]),
    body.mgp-themed-page > article span:not([style*="color:"]):not([class*="text-white"]),
    body.mgp-themed-page > article li,
    body.mgp-themed-page main ~ article p,
    body.mgp-themed-page main ~ article span:not([style*="color:"]),
    body.mgp-themed-page main ~ article li,
    body.mgp-themed-page main ~ section p,
    body.mgp-themed-page main ~ section li {
      color: #0F172A;
    }
    /* Preserve Tailwind white text on dark overlays/backgrounds */
    body.mgp-themed-page [class*="bg-black"] p,
    body.mgp-themed-page [class*="bg-black"] span,
    body.mgp-themed-page [class*="bg-black"] strong,
    body.mgp-themed-page [class*="bg-black"] button,
    body.mgp-themed-page [class*="bg-gray-9"] p,
    body.mgp-themed-page [class*="bg-gray-9"] span,
    body.mgp-themed-page [class*="bg-slate-9"] p,
    body.mgp-themed-page [class*="bg-slate-9"] span {
      color: #fff;
    }
    body.mgp-themed-page main > div a,
    body.mgp-themed-page > article a,
    body.mgp-themed-page main ~ article a { color: rgb(${C}); }
    body.mgp-themed-page > article code,
    body.mgp-themed-page main ~ article code { background:#F1F5F9; color:#334155; }

    /* ── LAYER 2: White text ONLY inside truly dark-background game areas ── */
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] p,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] p,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1E"] p,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1e"] p,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card):not(.sp-card):not(.ht-card):not(.rm-card):not(.eu-card):not(.oh-card):not(.cb-card):not(.ers-card):not(.pt-card):not(.pr-card):not([class*="card"]),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card):not(.sp-card):not(.ht-card):not(.rm-card):not(.eu-card):not(.oh-card):not(.cb-card):not(.ers-card):not(.pt-card):not(.pr-card):not([class*="card"]),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1E"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card):not(.sp-card):not(.ht-card):not(.rm-card):not(.eu-card):not(.oh-card):not(.cb-card):not(.ers-card):not(.pt-card):not(.pr-card):not([class*="card"]),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1e"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card):not(.sp-card):not(.ht-card):not(.rm-card):not(.eu-card):not(.oh-card):not(.cb-card):not(.ers-card):not(.pt-card):not(.pr-card):not([class*="card"]) {
      color: rgba(255,255,255,0.95);
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] span:not([style*="color:"]):not(.rk):not(.st):not(.rank):not(.rank2):not(.suit):not(.r):not(.label),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] span:not([style*="color:"]):not(.rk):not(.st):not(.rank):not(.rank2):not(.suit):not(.r):not(.label),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] strong,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] strong,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] label,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] label,
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1E"] span:not([style*="color:"]):not(.rk):not(.st):not(.rank):not(.rank2):not(.suit):not(.r):not(.label),
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#1e"] span:not([style*="color:"]):not(.rk):not(.st):not(.rank):not(.rank2):not(.suit):not(.r):not(.label) {
      color: rgba(255,255,255,0.85);
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    /* Inline-colored spans inside dark areas keep their color, just get shadow */
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0F"] span[style*="color:"],
    body.mgp-themed-page:not(.mgp-card-core-page) [style*="background:#0f"] span[style*="color:"] {
      text-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    /* Overlay elements — handled by [class*="bg-black"] rules above (white text) */

    /* ── LAYER 2.5: Preserve playing card colors ── */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.red span { color: #DC2626; text-shadow: none; }
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.black span { color: #1E293B; text-shadow: none; }
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card.facedown span { color: transparent; text-shadow: none; }
    body.mgp-themed-page .ce-card span,
    body.mgp-themed-page .pile-card span,
    body.mgp-themed-page .card-el span,
    body.mgp-themed-page .card-s span,
    body.mgp-themed-page .card-f span,
    body.mgp-themed-page .wc span,
    body.mgp-themed-page .gf-card span,
    body.mgp-themed-page .vp-card span,
    body.mgp-themed-page .hl-card span { text-shadow: none; }
    body.mgp-themed-page button[style*="color:#fff"],
    body.mgp-themed-page button[style*="color: #fff"],
    body.mgp-themed-page button[style*="color:white"],
    body.mgp-themed-page .action-btn,
    body.mgp-themed-page .bet-btn { text-shadow: none; }

    /* ── LAYER 3: Disclaimer boxes get dark amber text (wins over layers 1 & 2) ── */
    body.mgp-themed-page main [style*="background:#FEF3C7"] p,
    body.mgp-themed-page main [style*="background:#FEF3C7"] span,
    body.mgp-themed-page main [style*="background:#FEF3C7"] div,
    body.mgp-themed-page main [style*="background:#FEF3C7"] strong,
    body.mgp-themed-page main [style*="background:#FEF3C7"] em,
    body.mgp-themed-page main [style*="background:#FEF3C7"] b,
    body.mgp-themed-page main [style*="background: #FEF3C7"] p,
    body.mgp-themed-page main [style*="background: #FEF3C7"] span,
    body.mgp-themed-page main [style*="background: #FEF3C7"] div,
    body.mgp-themed-page main .bg-amber-50 p,
    body.mgp-themed-page main .bg-amber-50 span,
    body.mgp-themed-page main .bg-amber-50 div,
    body.mgp-themed-page [style*="background:#FEF3C7"] p,
    body.mgp-themed-page [style*="background:#FEF3C7"] span,
    body.mgp-themed-page [style*="background:#FEF3C7"] div,
    body.mgp-themed-page [style*="background:#FEF3C7"] strong,
    body.mgp-themed-page .bg-amber-50 p,
    body.mgp-themed-page .bg-amber-50 span,
    body.mgp-themed-page .bg-amber-50 div {
      color: #451A03;
      -webkit-text-fill-color: #451A03;
      font-size: clamp(13px, 2vw, 15px);
      font-weight: 700;
      text-transform: none;
      letter-spacing: normal;
      text-shadow: none;
    }

    /* ── Related games ── */
    body.mgp-themed-page #related-games {
      background: transparent; border: none; box-shadow: none; padding: 0;
      max-width: min(100%, 960px);
      margin-left: auto; margin-right: auto;
      overflow-x: hidden;
    }
    body.mgp-themed-page #related-games > section {
      background: rgba(255,255,255,0.97);
      border: 2px solid rgba(${C},0.25);
      border-radius: 20px;
      box-shadow: 0 16px 50px -16px rgba(0,0,0,0.45);
    }
    body.mgp-themed-page #related-games h3 { color: #0F172A; }
    body.mgp-themed-page .mgp-legacy-game-shell {
      width: 100%;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
      margin-bottom: 24px;
    }
    body.mgp-themed-page .mgp-legacy-game-shell {
      overflow: hidden;
    }
    body.mgp-themed-page .mgp-legacy-game-shell-canvas {
      background: #FFFFFF;
    }
    body.mgp-themed-page .mgp-legacy-game-shell-dom {
      overflow-y: auto;
      overflow-x: hidden;
    }
    body.mgp-themed-page .mgp-legacy-game-shell-canvas .relative,
    body.mgp-themed-page .mgp-legacy-game-shell-canvas #gameWrapper,
    body.mgp-themed-page .mgp-legacy-game-shell-canvas #game-wrap,
    body.mgp-themed-page .mgp-legacy-game-shell-canvas .touch-zone {
      max-width: 100%;
      margin-left: auto;
      margin-right: auto;
    }
    body.mgp-themed-page .mgp-legacy-game-shell-dom #game-area,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #battle-area,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #bet-phase,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #play-phase,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #board,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #sudoku-grid,
    body.mgp-themed-page .mgp-legacy-game-shell-dom #grid-container {
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* ── Buttons get flair ── */
    body.mgp-themed-page main button,
    body.mgp-themed-page main [role="button"],
    body.mgp-themed-page > article button,
    body.mgp-themed-page main ~ article button {
      border-radius: 12px;
      font-weight: 600;
      min-height: 44px;
      transition: transform 0.15s, box-shadow 0.15s, background-color 0.15s;
    }
    @media (hover: hover) {
      body.mgp-themed-page main button:hover,
      body.mgp-themed-page main [role="button"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px -4px rgba(${C},0.4);
      }
    }
    body.mgp-themed-page main button:active,
    body.mgp-themed-page main [role="button"]:active {
      transform: scale(0.97);
    }

    /* ── Scoped Tailwind button overrides (buttons only) ── */
    body.mgp-themed-page main button.text-sm,
    body.mgp-themed-page main select.text-sm {
      font-size: 15px;
    }
    body.mgp-themed-page main button.px-3,
    body.mgp-themed-page main select.px-3 {
      padding-left: 16px; padding-right: 16px;
    }
    body.mgp-themed-page main button.py-1,
    body.mgp-themed-page main select.py-1 {
      padding-top: 8px; padding-bottom: 8px;
    }
    body.mgp-themed-page main button.px-6 {
      padding-left: 28px; padding-right: 28px;
    }
    body.mgp-themed-page main button.py-2,
    body.mgp-themed-page main select.py-2 {
      padding-top: 12px; padding-bottom: 12px;
    }
    body.mgp-themed-page main button.py-3 {
      padding-top: 16px; padding-bottom: 16px;
    }

    /* ── Mobile: tablet ── */
    @media (max-width: 768px) {
      .mgp-scatter-emoji { opacity: 0.15; }
      .mgp-banner-e { font-size: 1rem; }
      #mgp-header-emojis { gap: 3px; }
      body.mgp-themed-page main {
        padding: 4px;
      }
      ${CONTENT} {
        padding: 12px;
        border-radius: 14px;
      }
    }
    /* ── Mobile: phone ── */
    @media (max-width: 480px) {
      .mgp-scatter-emoji { opacity: 0.10; font-size: 80%; }
      .mgp-banner-e { font-size: 0.85rem; }
      #mgp-header-emojis { gap: 2px; }
      body.mgp-themed-page main {
        padding: 2px;
      }
      ${CONTENT} {
        padding: 8px;
        border-radius: 12px;
      }
      body.mgp-themed-page .action-btn,
      body.mgp-themed-page .bet-btn {
        padding: 10px 20px; font-size: 14px;
      }
    }

    /* ═══════════════════════════════════════════════════════════════
       UNIVERSAL CARD FACE UPGRADE — premium look for ALL card games
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page .ce-card:not(.disabled),
    body.mgp-themed-page .gf-card,
    body.mgp-themed-page .ht-card.face-up,
    body.mgp-themed-page .vp-card:not(.facedown),
    body.mgp-themed-page .hl-card:not(.facedown),
    body.mgp-themed-page .pile-card,
    body.mgp-themed-page .wc:not(.facedown),
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card-el.face-up,
    body.mgp-themed-page .card-f:not(.face-down),
    body.mgp-themed-page .card-s.up,
    body.mgp-themed-page .ers-card.face-up {
      background: linear-gradient(135deg, #FFFFFF 0%, #F3F4F6 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.08);
    }
    body.mgp-themed-page .ce-card.playable,
    body.mgp-themed-page .ht-card.playable,
    body.mgp-themed-page .card-el.playable {
      animation: cardPulse 2s ease-in-out infinite;
    }
    @keyframes cardPulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
      50% { box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 0 12px rgba(59,130,246,0.3); }
    }
    body.mgp-themed-page .ce-card.selected,
    body.mgp-themed-page .gf-card.selected,
    body.mgp-themed-page .ht-card.selected,
    body.mgp-themed-page .card.selected {
      transform: translateY(-8px);
      box-shadow: 0 0 0 3px #3B82F6, 0 8px 20px rgba(0,0,0,0.2);
    }
    /* Card backs */
    body.mgp-themed-page .ce-card.disabled,
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card-el.face-down,
    body.mgp-themed-page .card-s.down,
    body.mgp-themed-page .card-f.face-down,
    body.mgp-themed-page .gf-back,
    body.mgp-themed-page .ht-card.face-down,
    body.mgp-themed-page .ers-card.face-down {
      background: linear-gradient(135deg, #1E3A5F 0%, #2D1B69 50%, #1E3A5F 100%);
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    /* Preserve red/black card text colors */
    body.mgp-themed-page .ce-card.red,
    body.mgp-themed-page .gf-card.red,
    body.mgp-themed-page .ht-card.red,
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card-el .card-red,
    body.mgp-themed-page .ers-card.red { color: #DC2626; text-shadow: none; }
    body.mgp-themed-page .ce-card.blk,
    body.mgp-themed-page .gf-card.blk,
    body.mgp-themed-page .ht-card.black,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card-el .card-black,
    body.mgp-themed-page .ers-card.black { color: #1E293B; text-shadow: none; }

    /* ═══════════════════════════════════════════════════════════════
       FELT TABLE SURFACE — universal for card/casino game areas
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page [style*="background:linear-gradient(160deg,#1a5c35"],
    body.mgp-themed-page [style*="background:linear-gradient(145deg,#1a5c35"],
    body.mgp-themed-page [style*="background: linear-gradient(160deg, #1a5c35"],
    body.mgp-themed-page .game-table,
    body.mgp-themed-page .mgp-table-surface {
      position: relative;
      overflow: hidden;
    }
    body.mgp-themed-page [style*="background:linear-gradient(160deg,#1a5c35"]::before,
    body.mgp-themed-page [style*="background:linear-gradient(145deg,#1a5c35"]::before,
    body.mgp-themed-page [style*="background: linear-gradient(160deg, #1a5c35"]::before,
    body.mgp-themed-page .game-table::before,
    body.mgp-themed-page .mgp-table-surface::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px;
      pointer-events: none;
      border-radius: inherit;
    }

    /* ═══════════════════════════════════════════════════════════════
       GAME-OVER SECTION UPGRADE — dark, polished look
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page #game-over:not([style*="display:none"]):not([style*="display: none"]),
    body.mgp-themed-page [id$="-gameover"],
    body.mgp-themed-page .game-over-overlay {
      background: rgba(15,23,42,0.92);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      color: #fff;
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.1);
    }
    body.mgp-themed-page #game-over h2,
    body.mgp-themed-page #game-over h3,
    body.mgp-themed-page #game-over [id*="title"],
    body.mgp-themed-page [id$="-gameover"] h2,
    body.mgp-themed-page .game-over-overlay h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    body.mgp-themed-page #game-over [id*="score"],
    body.mgp-themed-page [id$="-gameover"] [id*="score"],
    body.mgp-themed-page .game-over-score {
      font-family: 'DM Mono', monospace;
      font-size: 42px;
      font-weight: 700;
      color: #F59E0B;
    }
    body.mgp-themed-page #game-over button,
    body.mgp-themed-page [id$="-gameover"] button,
    body.mgp-themed-page .game-over-overlay button {
      background: #3B82F6;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 12px 32px;
      font-size: 15px;
      font-weight: 700;
      font-family: 'Space Grotesk', sans-serif;
      cursor: pointer;
      margin-top: 16px;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(59,130,246,0.3);
    }
    body.mgp-themed-page #game-over button:hover,
    body.mgp-themed-page [id$="-gameover"] button:hover,
    body.mgp-themed-page .game-over-overlay button:hover {
      background: #2563EB;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59,130,246,0.4);
    }

    /* ═══════════════════════════════════════════════════════════════
       DICE UPGRADE — 3D appearance
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page .dice-face,
    body.mgp-themed-page .die {
      background: linear-gradient(145deg, #FFFFFF 0%, #E5E7EB 100%);
      border-radius: 12px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8);
    }
    body.mgp-themed-page .pip,
    body.mgp-themed-page .die-pip {
      background: #1E293B;
      border-radius: 50%;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
    }

    /* ═══════════════════════════════════════════════════════════════
       CASINO ACCENT POLISH — emerald highlights for slot/roulette
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page[data-game-slug="roulette"] .bet-chip {
      box-shadow: 0 8px 18px rgba(15,23,42,0.24);
    }
    body.mgp-themed-page[data-game-slug="roulette"] .bet-chip.selected {
      box-shadow: 0 0 0 3px #059669, 0 12px 26px rgba(5,150,105,0.45);
      transform: translateY(-3px) scale(1.14);
    }
    body.mgp-themed-page[data-game-slug="roulette"] .bet-cell {
      position: relative;
      overflow: visible;
    }
    body.mgp-themed-page[data-game-slug="roulette"] .bet-cell.has-bet {
      box-shadow: inset 0 0 0 2px #059669, 0 0 0 1px rgba(16,185,129,0.2), 0 10px 24px rgba(5,150,105,0.24);
      transform: translateY(-1px) scale(1.02);
    }
    body.mgp-themed-page[data-game-slug="roulette"] .bet-cell.has-bet::after {
      content: '';
      position: absolute;
      top: -6px;
      right: -6px;
      width: 15px;
      height: 15px;
      border-radius: 999px;
      background: radial-gradient(circle at 35% 35%, #ECFDF5 0 24%, #10B981 25% 60%, #047857 61% 100%);
      border: 2px solid rgba(236,253,245,0.95);
      box-shadow: 0 4px 10px rgba(5,150,105,0.4), 0 0 0 3px rgba(5,150,105,0.12);
      animation: mgpChipStack 0.4s ease;
      pointer-events: none;
    }
    @keyframes mgpChipStack {
      0% { transform: translateY(6px) scale(0.7); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    body.mgp-themed-page[data-game-slug="slot-machine"] .slot-window {
      border-color: #059669;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 14px rgba(5,150,105,0.35);
    }
    body.mgp-themed-page[data-game-slug="slot-machine"] .slot-light:nth-child(odd) {
      background: #10B981;
    }
    body.mgp-themed-page[data-game-slug="slot-machine"] .slot-light:nth-child(even) {
      background: #34D399;
    }
    body.mgp-themed-page[data-game-slug="slot-machine"] .mode-btn[style*="background:#f59e0b"],
    body.mgp-themed-page[data-game-slug="slot-machine"] .mode-btn[style*="background: #f59e0b"] {
      background: #059669;
      border-color: #10B981;
      color: #ECFDF5;
      box-shadow: 0 10px 24px rgba(5,150,105,0.3);
    }
    body.mgp-themed-page[data-game-slug="spin-the-wheel"] #spin-btn,
    body.mgp-themed-page[data-game-slug="roulette"] #spin-btn {
      background: linear-gradient(135deg, #10B981 0%, #047857 100%);
      border-color: #065F46;
      color: #ECFDF5;
      box-shadow: 0 10px 28px rgba(5,150,105,0.34);
    }

    /* ═══════════════════════════════════════════════════════════════
       SCORE DISPLAY — DM Mono, consistent across all games
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page [id*="score"]:not(button):not(a):not(tr):not(td),
    body.mgp-themed-page [id*="Score"]:not(button):not(a):not(tr):not(td),
    body.mgp-themed-page [id*="best"]:not(button):not(a),
    body.mgp-themed-page [id*="Best"]:not(button):not(a),
    body.mgp-themed-page [id*="timer"]:not(button),
    body.mgp-themed-page [id*="Timer"]:not(button),
    body.mgp-themed-page [id*="count"]:not(button):not(select),
    body.mgp-themed-page [id*="level"]:not(button):not(select):not(div[style*="display"]) {
      font-family: 'DM Mono', monospace;
      font-weight: 700;
    }

    /* ═══════════════════════════════════════════════════════════════
       LEADERBOARD — consistent styling
       ═══════════════════════════════════════════════════════════════ */
    body.mgp-themed-page #mgp-leaderboard details {
      background: rgba(255,255,255,0.97);
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
  `;
}

// ─── NAV ────────────────────────────────────────────────────────

function renderNav(gameName) {
  let el = document.getElementById('nav-container');
  if (!el) {
    el = document.querySelector('.nav-container');
  }
  if (!el) return;

  const navHTML = `
    <nav style="position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:2px solid #0F172A;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;max-width:100%;">
      <a href="/" style="display:flex;align-items:center;text-decoration:none;">
        <img src="/images/logo.png" alt="Mini Game Planet" style="height:36px;width:auto;">
      </a>
      <a href="/leaderboard" style="position:absolute;left:50%;transform:translateX(-50%);font-size:15px;font-weight:700;color:#D97706;text-decoration:none;transition:all 0.15s;display:flex;align-items:center;gap:4px;" onmouseover="this.style.color='#B45309';this.style.transform='translateX(-50%) scale(1.05)'" onmouseout="this.style.color='#D97706';this.style.transform='translateX(-50%)'">👑 Leaderboards 👑</a>
      <button id="sound-toggle-nav" style="background:#0F172A;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;">
        <span id="sound-icon-nav">🔊</span> Sound
      </button>
    </nav>
  `;

  const _navSavedIds = [];
  el.querySelectorAll('[id]').forEach(c => _navSavedIds.push(c.id));

  if (el.tagName === 'NAV') {
    const wrapper = document.createElement('div');
    wrapper.id = 'nav-container';
    wrapper.innerHTML = navHTML;
    el.replaceWith(wrapper);
  } else {
    el.id = 'nav-container';
    el.innerHTML = navHTML;
  }

  _navSavedIds.forEach(oldId => {
    if (!document.getElementById(oldId)) {
      const d = document.createElement('button');
      d.id = oldId;
      d.style.cssText = 'display:none;position:absolute;pointer-events:none;';
      document.body.appendChild(d);
    }
  });

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
  let el = document.getElementById('footer-container');
  if (!el) el = document.querySelector('.footer-container');
  if (!el) return;

  const footerHTML = `
    <footer style="background:#fff;border-top:1px solid #E2E8F0;padding:32px 24px 16px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;max-width:100%;">
      <div style="display:flex;align-items:center;gap:10px;font-size:14px;color:#64748B;">
        <img src="/images/logo.png" alt="Mini Game Planet" style="height:34px;width:auto;flex-shrink:0;">
        <span>&copy; Mini Game Planet</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <a href="/about" style="font-size:13px;color:#64748B;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">About</a>
        <a href="/privacy" style="font-size:13px;color:#64748B;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">Privacy</a>
        <a href="/terms" style="font-size:13px;color:#64748B;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">Terms</a>
        <a href="/cookies" style="font-size:13px;color:#64748B;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">Cookies</a>
        <a href="/licenses" style="font-size:13px;color:#64748B;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">Licenses</a>
        <button id="footer-cookie-settings" style="font-size:13px;color:#64748B;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#64748B'">Cookie Settings</button>
      </div>
    </footer>
  `;

  const _footSavedIds = [];
  el.querySelectorAll('[id]').forEach(c => _footSavedIds.push(c.id));

  if (el.tagName === 'FOOTER') {
    const wrapper = document.createElement('div');
    wrapper.id = 'footer-container';
    wrapper.innerHTML = footerHTML;
    el.replaceWith(wrapper);
  } else {
    el.innerHTML = footerHTML;
  }

  _footSavedIds.forEach(oldId => {
    if (!document.getElementById(oldId)) {
      const d = document.createElement('button');
      d.id = oldId;
      d.style.cssText = 'display:none;position:absolute;pointer-events:none;';
      document.body.appendChild(d);
    }
  });

  const cookieBtn = document.getElementById('footer-cookie-settings');
  if (cookieBtn) {
    cookieBtn.addEventListener('click', () => openConsentBanner());
  }
}

// ─── RELATED GAMES — Full-Bleed Color Tiles ─────────────────────

function renderRelatedGames(currentSlug, category) {
  let el = document.getElementById('related-games');
  if (!el) return;

  if (el.tagName === 'SECTION') {
    const wrapper = document.createElement('div');
    wrapper.id = 'related-games';
    el.replaceWith(wrapper);
    el = wrapper;
  }

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
    <section style="max-width:min(100%,960px);margin:0 auto;padding:16px;">
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
    .game-tile:hover .tile-play-cta{opacity:1;transform:translateX(0);}
    .game-tile:hover .tile-bg-emoji{opacity:0.18;transform:rotate(-8deg) scale(1.05);}
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

// ── Section 6: Controls Hint Bar ──

function injectControlsHint(game) {
  if (!game || document.getElementById('mgp-controls-hint')) return;
  const isCanvas = !!document.querySelector('main canvas');
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) return;

  let hints = [];
  if (isCanvas) {
    hints = ['Arrow keys / WASD', 'Space to act', 'M to mute'];
  } else if (['Card', 'Casino'].includes(game.category)) {
    hints = ['Click cards to play', 'Enter to deal'];
  } else if (['Puzzle', 'Math', 'Board', 'Strategy'].includes(game.category)) {
    hints = ['Click to select', 'Arrow keys to navigate', 'Enter to confirm'];
  } else if (game.category === 'Word') {
    hints = ['Type letters on keyboard', 'Enter to submit'];
  } else {
    hints = ['Click to interact', 'M to mute'];
  }

  const host = getControlsOverlayHost() || ensureOverlayHost(markGameShell()) || ensureOverlayHost(document.querySelector('main'));
  if (!host) return;

  const overlay = document.createElement('div');
  overlay.id = 'mgp-controls-hint';
  overlay.className = 'mgp-controls-hint-overlay is-visible';
  overlay.textContent = hints.join(' • ');
  host.appendChild(overlay);

  window.setTimeout(() => {
    overlay.classList.remove('is-visible');
    overlay.classList.add('is-hidden');
  }, 3000);

  window.setTimeout(() => {
    overlay.remove();
  }, 3600);
}

// ── Section 7: Category-Specific Atmosphere ──

function injectCategoryAtmosphere(game) {
  if (!game || document.getElementById('mgp-atmosphere-style')) return;
  const cat = game.category;
  const style = document.createElement('style');
  style.id = 'mgp-atmosphere-style';

  const atmospheres = {
    Card: ``,
    Casino: `
      body.mgp-themed-page [style*="background:#0F"],
      body.mgp-themed-page [style*="background:#0f"],
      body.mgp-themed-page #game-area {
        background: linear-gradient(160deg, #0d3320 0%, #072015 100%);
      }
    `,
    Arcade: `
      body.mgp-themed-page canvas {
        box-shadow: 0 0 0 3px rgba(0,255,255,0.4), 0 0 20px rgba(0,255,255,0.3), 0 0 60px rgba(0,255,255,0.15), 0 16px 40px -12px rgba(0,0,0,0.6);
      }
    `,
    Action: `
      body.mgp-themed-page canvas {
        box-shadow: 0 0 0 3px rgba(255,100,0,0.4), 0 0 20px rgba(255,100,0,0.3), 0 0 60px rgba(255,100,0,0.15), 0 16px 40px -12px rgba(0,0,0,0.6);
      }
    `,
    Puzzle: `
      body.mgp-themed-page main > div:first-child,
      body.mgp-themed-page main > .card:first-child {
        background: #FAFBFC;
      }
    `,
    Math: `
      body.mgp-themed-page main > div:first-child,
      body.mgp-themed-page main > .card:first-child {
        background: #F8FAFF;
      }
    `,
    Word: `
      body.mgp-themed-page main > div:first-child,
      body.mgp-themed-page main > .card:first-child {
        background: #FAF8F5;
      }
    `,
    Board: `
      body.mgp-themed-page #chess-board,
      body.mgp-themed-page #board,
      body.mgp-themed-page [id*="board"] {
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
    `,
    Strategy: `
      body.mgp-themed-page #chess-board,
      body.mgp-themed-page #board {
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      }
    `,
    Casual: `
      body.mgp-themed-page main > div:first-child {
        background: #FFFBF5;
      }
    `,
    Builder: `
      body.mgp-themed-page main > div:first-child {
        background: #F5F7FA;
      }
    `
  };

  style.textContent = atmospheres[cat] || '';
  document.head.appendChild(style);
}

// ── Section 8: Auto-wire sound on all buttons ──

function wireButtonSounds() {
  let hoverDebounce = 0;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, [role="button"], a.game-tile, .speed-btn, .num-btn, .kb-letter');
    if (btn) {
      try { initAudio(); } catch (_) {}
    }
  }, true);

  document.addEventListener('pointerenter', (e) => {
    const btn = e.target.closest?.('button, [role="button"]');
    if (btn && Date.now() - hoverDebounce > 100) {
      hoverDebounce = Date.now();
    }
  }, true);
}

function ensureMgpCoreStyles() {
  let link = document.querySelector('link[href="/css/mgp-core.css"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/mgp-core.css';
    document.head.appendChild(link);
  }

  if (!document.getElementById('mgp-card-core-overrides')) {
    const style = document.createElement('style');
    style.id = 'mgp-card-core-overrides';
    style.textContent = `
      .mgp-card-core-page #mgp-card-legacy-root > div > div:first-child {
        display: none;
      }
      .mgp-card-core-page #mgp-card-legacy-root {
        width: 100%;
        max-width: 100%;
      }
      body.mgp-card-core-page .mgp-theme-felt {
        background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"), linear-gradient(135deg, #1a472a 0%, #0d2818 100%);
        background-repeat: repeat, no-repeat;
        background-size: 40px 40px, auto;
        background-position: 0 0, 0 0;
      }
      body.mgp-card-core-page .mgp-theme-felt::before,
      body.mgp-card-core-page #game-area::before,
      body.mgp-card-core-page #game-canvas::before,
      body.mgp-card-core-page #spades-table::before,
      body.mgp-card-core-page #hearts-table::before,
      body.mgp-card-core-page #rm-table::before,
      body.mgp-card-core-page #eu-table::before,
      body.mgp-card-core-page #oh-table::before,
      body.mgp-card-core-page #pt-table::before,
      body.mgp-card-core-page #cb-board::before,
      body.mgp-card-core-page #ers-table::before,
      body.mgp-card-core-page [style*="background:#0F"]::before,
      body.mgp-card-core-page [style*="background:#0f"]::before {
        content: none;
        display: none;
      }
      .mgp-card-core-page .mgp-theme-felt,
      .mgp-card-core-page .mgp-game-wrapper,
      .mgp-card-core-page .mgp-game-area,
      .mgp-card-core-page #mgp-card-legacy-root,
      .mgp-card-core-page #game-area,
      .mgp-card-core-page #game-canvas,
      .mgp-card-core-page #spades-table,
      .mgp-card-core-page #hearts-table,
      .mgp-card-core-page #rm-table,
      .mgp-card-core-page #eu-table,
      .mgp-card-core-page #oh-table,
      .mgp-card-core-page #pt-table,
      .mgp-card-core-page #cb-board,
      .mgp-card-core-page #ers-table {
        isolation: isolate;
      }
      .mgp-card-core-page .vp-card,
      .mgp-card-core-page .gf-card,
      .mgp-card-core-page .ce-card,
      .mgp-card-core-page .sp-card,
      .mgp-card-core-page .ht-card,
      .mgp-card-core-page .rm-card,
      .mgp-card-core-page .eu-card,
      .mgp-card-core-page .oh-card,
      .mgp-card-core-page .cb-card,
      .mgp-card-core-page .ers-card,
      .mgp-card-core-page .pt-card,
      .mgp-card-core-page .pr-card,
      .mgp-card-core-page .gr-card,
      .mgp-card-core-page .card,
      .mgp-card-core-page .wc,
      .mgp-card-core-page .hl-card {
        isolation: isolate;
        will-change: transform, box-shadow;
        transform: translateZ(0);
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transition-property: box-shadow, filter, border-color, background-color, opacity;
      }
      .mgp-card-core-page .card::before,
      .mgp-card-core-page .wc::before,
      .mgp-card-core-page .hl-card::before,
      .mgp-card-core-page .vp-card::before,
      .mgp-card-core-page .gf-card::before,
      .mgp-card-core-page .ce-card::before,
      .mgp-card-core-page .sp-card::before,
      .mgp-card-core-page .ht-card::before,
      .mgp-card-core-page .rm-card::before,
      .mgp-card-core-page .eu-card::before,
      .mgp-card-core-page .oh-card::before,
      .mgp-card-core-page .cb-card::before,
      .mgp-card-core-page .ers-card::before,
      .mgp-card-core-page .pt-card::before,
      .mgp-card-core-page .pr-card::before,
      .mgp-card-core-page .gr-card::before {
        pointer-events: none;
        z-index: 0;
      }
      .mgp-card-core-page .card::after,
      .mgp-card-core-page .wc::after,
      .mgp-card-core-page .hl-card::after,
      .mgp-card-core-page .vp-card::after,
      .mgp-card-core-page .gf-card::after,
      .mgp-card-core-page .ce-card::after,
      .mgp-card-core-page .sp-card::after,
      .mgp-card-core-page .ht-card::after,
      .mgp-card-core-page .rm-card::after,
      .mgp-card-core-page .eu-card::after,
      .mgp-card-core-page .oh-card::after,
      .mgp-card-core-page .cb-card::after,
      .mgp-card-core-page .ers-card::after,
      .mgp-card-core-page .pt-card::after,
      .mgp-card-core-page .pr-card::after,
      .mgp-card-core-page .gr-card::after {
        pointer-events: none;
      }
      .mgp-card-core-page .card > *,
      .mgp-card-core-page .wc > *,
      .mgp-card-core-page .hl-card > *,
      .mgp-card-core-page .vp-card > *,
      .mgp-card-core-page .gf-card > *,
      .mgp-card-core-page .ce-card > *,
      .mgp-card-core-page .sp-card > *,
      .mgp-card-core-page .ht-card > *,
      .mgp-card-core-page .rm-card > *,
      .mgp-card-core-page .eu-card > *,
      .mgp-card-core-page .oh-card > *,
      .mgp-card-core-page .cb-card > *,
      .mgp-card-core-page .ers-card > *,
      .mgp-card-core-page .pt-card > *,
      .mgp-card-core-page .pr-card > *,
      .mgp-card-core-page .gr-card > * {
        position: relative;
        z-index: 1;
      }
      .mgp-card-core-page .vp-card:hover,
      .mgp-card-core-page .gf-card:hover,
      .mgp-card-core-page .ce-card:hover,
      .mgp-card-core-page .sp-card:hover,
      .mgp-card-core-page .ht-card:hover,
      .mgp-card-core-page .rm-card:hover,
      .mgp-card-core-page .eu-card:hover,
      .mgp-card-core-page .oh-card:hover,
      .mgp-card-core-page .cb-card:hover,
      .mgp-card-core-page .ers-card:hover,
      .mgp-card-core-page .pt-card:hover,
      .mgp-card-core-page .pr-card:hover,
      .mgp-card-core-page .gr-card:hover,
      .mgp-card-core-page .card:hover,
      .mgp-card-core-page .wc:hover,
      .mgp-card-core-page .hl-card:hover {
        z-index: 2;
      }
      .mgp-card-core-page .vp-card:hover,
      .mgp-card-core-page .gf-card:hover,
      .mgp-card-core-page .ce-card:hover,
      .mgp-card-core-page .sp-card:hover,
      .mgp-card-core-page .ht-card:hover,
      .mgp-card-core-page .rm-card:hover,
      .mgp-card-core-page .eu-card:hover,
      .mgp-card-core-page .oh-card:hover,
      .mgp-card-core-page .cb-card:hover,
      .mgp-card-core-page .ers-card:hover,
      .mgp-card-core-page .pt-card:hover,
      .mgp-card-core-page .pr-card:hover,
      .mgp-card-core-page .gr-card:hover,
      .mgp-card-core-page .card:hover,
      .mgp-card-core-page .wc:hover,
      .mgp-card-core-page .hl-card:hover {
        transform: translateZ(0);
        box-shadow: 0 8px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12);
        filter: brightness(1.02);
      }
      .mgp-casino-core-page #mgp-casino-legacy-root {
        width: 100%;
        max-width: 100%;
      }
      .mgp-casino-core-page #mgp-casino-legacy-root > article,
      .mgp-casino-core-page #mgp-casino-legacy-root > section {
        margin-bottom: 0;
      }
      .mgp-casino-core-page #mgp-casino-legacy-root .prose {
        max-width: none;
      }
      .mgp-arcade-core-page #mgp-arcade-legacy-root {
        width: 100%;
        max-width: 100%;
      }
      .mgp-arcade-core-page #mgp-arcade-legacy-root .prose {
        max-width: none;
      }
      .mgp-arcade-core-page #mgp-arcade-legacy-root canvas,
      .mgp-arcade-core-page #mgp-arcade-legacy-root #gameCanvas,
      .mgp-arcade-core-page #mgp-arcade-legacy-root #game-canvas {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
        margin-left: auto;
        margin-right: auto;
      }
    `;
    document.head.appendChild(style);
  }
}

function extractCoreSeoSource(legacyRoot) {
  const seoSource = document.getElementById('mgp-seo-source') || document.createElement('div');
  seoSource.id = 'mgp-seo-source';
  seoSource.style.display = 'none';
  seoSource.innerHTML = '';

  if (!legacyRoot) return seoSource;

  const children = Array.from(legacyRoot.children || []);
  const gameplayIndex = children.findIndex((node) => node.querySelector?.('canvas, #game-area, #gameCanvas, #game-canvas, #gameWrapper'));
  const directSeoNodes = gameplayIndex >= 0
    ? children.slice(gameplayIndex + 1).filter((node) => node.matches?.('article, section, [class*="prose"]') && node.id !== 'related-games' && node.id !== 'footer-container' && !node.matches?.('.footer-container'))
    : [];

  if (directSeoNodes.length) {
    seoSource.innerHTML = directSeoNodes.map((node) => node.outerHTML).join('');
    directSeoNodes.forEach((node) => node.remove());
    return seoSource;
  }

  const bodySeoNodes = [];
  let sibling = legacyRoot.nextElementSibling;
  while (sibling) {
    const next = sibling.nextElementSibling;
    if (sibling.id === 'related-games' || sibling.id === 'footer-container' || sibling.matches?.('.footer-container')) break;
    if (sibling.matches?.('article, section, [class*="prose"]')) bodySeoNodes.push(sibling);
    sibling = next;
  }

  if (bodySeoNodes.length) {
    seoSource.innerHTML = bodySeoNodes.map((node) => node.outerHTML).join('');
    bodySeoNodes.forEach((node) => node.remove());
    return seoSource;
  }

  const gameplayBlock = children[gameplayIndex] || legacyRoot.firstElementChild;
  const inlineChildren = gameplayBlock ? Array.from(gameplayBlock.children || []) : [];
  const inlineSeoIndex = inlineChildren.findIndex((node) => node.matches?.('.prose, article[class*="prose"], section[class*="prose"], div[class*="prose"]'));
  if (gameplayBlock && inlineSeoIndex >= 0) {
    const inlineSeoNodes = inlineChildren.slice(inlineSeoIndex);
    seoSource.innerHTML = inlineSeoNodes
      .filter((node) => node.id !== 'related-games' && node.id !== 'footer-container' && !node.matches?.('.footer-container'))
      .map((node) => node.outerHTML)
      .join('');
    inlineSeoNodes.forEach((node) => node.remove());
  }

  return seoSource;
}

function findArcadeLegacyRoot() {
  const main = document.querySelector('main');
  if (main) return main;
  return Array.from(document.body.children).find((node) => node.matches?.('div, section, article') && node.querySelector?.('canvas, #game-area, #gameCanvas, #game-canvas, #gameWrapper')) || null;
}

function hoistLegacyNav(legacyRoot) {
  if (!legacyRoot || legacyRoot.matches?.('main')) return;
  const nav = Array.from(legacyRoot.children || []).find((node) => node.id === 'nav-container' || node.classList?.contains('nav-container'));
  if (!nav) return;
  if (!nav.id) nav.id = 'nav-container';
  document.body.insertBefore(nav, legacyRoot);
}

function initCardCoreShell(game) {
  if (!game || game.category !== 'Card' || window.__mgpCardCoreReady) return;
  ensureMgpCoreStyles();

  const main = document.querySelector('main');
  if (!main) return;

  const article = document.querySelector('main ~ article') || document.querySelector('body > article');
  const related = document.getElementById('related-games');
  const footer = document.getElementById('footer-container');

  const seoSource = document.getElementById('mgp-seo-source') || document.createElement('div');
  seoSource.id = 'mgp-seo-source';
  seoSource.style.display = 'none';
  seoSource.innerHTML = article?.innerHTML || '';
  document.body.appendChild(seoSource);

  const legacyRoot = main;
  legacyRoot.id = legacyRoot.id || 'mgp-card-legacy-root';
  article?.remove();
  related?.remove();

  MGP.init({
    slug: game.slug,
    category: game.category,
    title: game.name,
    scoreMode: 'none',
    hasTimer: false,
    canPause: false,
    trackAnalytics: false,
    onRestart: () => window.__mgpCardRestart?.(),
    ...(window.__mgpCardConfig || {}),
  });

  window.__mgpCardConfig = null;

  MGP.mountContent(legacyRoot);
  document.body.classList.add('mgp-themed-page', 'mgp-card-core-page');
  window.__mgpCardCoreReady = true;
}

function initCasinoCoreShell(game) {
  if (!game || game.category !== 'Casino' || window.__mgpCasinoCoreReady) return;
  ensureMgpCoreStyles();

  const main = document.querySelector('main');
  if (!main) return;

  const related = document.getElementById('related-games');
  const footer = document.getElementById('footer-container') || document.querySelector('.footer-container');

  const seoSource = extractCoreSeoSource(main);

  if (seoSource.innerHTML.trim()) {
    document.body.appendChild(seoSource);
  }

  const legacyRoot = main;
  legacyRoot.id = legacyRoot.id || 'mgp-casino-legacy-root';

  related?.remove();

  MGP.init({
    slug: game.slug,
    category: game.category,
    title: game.name,
    scoreMode: 'none',
    showBest: false,
    hasTimer: false,
    canPause: false,
    trackAnalytics: false,
    onRestart: () => {
      if (typeof window.__mgpCasinoRestart === 'function') {
        window.__mgpCasinoRestart();
        return;
      }
      window.location.reload();
    },
    ...(window.__mgpCasinoConfig || {}),
  });

  window.__mgpCasinoConfig = null;

  MGP.mountContent(legacyRoot);
  document.body.classList.add('mgp-themed-page', 'mgp-casino-core-page');
  window.__mgpCasinoCoreReady = true;
}

function initArcadeCoreShell(game) {
  if (!game || game.category !== 'Arcade' || window.__mgpArcadeCoreReady) return;
  ensureMgpCoreStyles();

  const legacyRoot = findArcadeLegacyRoot();
  if (!legacyRoot) return;

  hoistLegacyNav(legacyRoot);

  const related = document.getElementById('related-games');
  const footer = document.getElementById('footer-container') || document.querySelector('.footer-container');
  const seoSource = extractCoreSeoSource(legacyRoot);

  if (seoSource.innerHTML.trim()) {
    document.body.appendChild(seoSource);
  }

  legacyRoot.id = legacyRoot.id || 'mgp-arcade-legacy-root';

  related?.remove();

  MGP.init({
    slug: game.slug,
    category: game.category,
    title: game.name,
    scoreMode: 'none',
    showBest: false,
    hasTimer: false,
    canPause: false,
    trackAnalytics: false,
    onRestart: () => {
      if (typeof window.__mgpArcadeRestart === 'function') {
        window.__mgpArcadeRestart();
        return;
      }
      window.location.reload();
    },
    ...(window.__mgpArcadeConfig || {}),
  });

  window.__mgpArcadeConfig = null;

  MGP.mountContent(legacyRoot);
  document.body.classList.add('mgp-themed-page', 'mgp-arcade-core-page');
  window.__mgpArcadeCoreReady = true;
}

export function initToolPage(slug) {
  window._mgpGameSlug = slug;
  window._mgpGameStart = Date.now();
  document.body.dataset.gameSlug = slug;

  const game = games.find(g => g.slug === slug);
  const gameName = game ? game.name : '';
  const category = game ? game.category : '';

  if (game?.category === 'Card') {
    renderNav(gameName);
    initCardCoreShell(game);
    renderFooter();
    if (game) {
      applyGamePageDecor(game);
      injectControlsHint(game);
    }
    wireButtonSounds();
    return;
  }

  if (game?.category === 'Casino') {
    renderNav(gameName);
    initCasinoCoreShell(game);
    renderFooter();
    if (game) {
      applyGamePageDecor(game);
      injectCategoryAtmosphere(game);
      injectControlsHint(game);
    }
    wireButtonSounds();
    return;
  }

  if (game?.category === 'Arcade') {
    renderNav(gameName);
    initArcadeCoreShell(game);
    renderFooter();
    if (game) {
      applyGamePageDecor(game);
      injectCategoryAtmosphere(game);
      injectControlsHint(game);
    }
    wireButtonSounds();
    return;
  }

  renderNav(gameName);
  renderFooter();
  renderRelatedGames(slug, category);

  const _main = document.querySelector('main');
  const _related = document.getElementById('related-games');
  const _footer = document.getElementById('footer-container');
  const _article = document.querySelector('main ~ article') || document.querySelector('body > article');
  if (_main && _related && _article && _footer) {
    const parent = _footer.parentNode || document.body;
    parent.insertBefore(_related, _footer);
    parent.insertBefore(_article, _footer);
  }

  if (!document.getElementById('tile-hover-styles')) {
    const style = document.createElement('style');
    style.id = 'tile-hover-styles';
    style.textContent = `
      .game-tile:hover .tile-play-cta{opacity:1;transform:translateX(0);}
      .game-tile:hover .tile-bg-emoji{opacity:0.18;transform:rotate(-8deg) scale(1.05);}
    `;
    document.head.appendChild(style);
  }

  if (game) {
    applyGamePageDecor(game);
    injectCategoryAtmosphere(game);
    injectControlsHint(game);
  }
  wireButtonSounds();
}

export { renderNav, renderFooter, renderRelatedGames, buildGameCard, games, categories, getCategoryAccent, getCategoryIcon, shuffleArray };
