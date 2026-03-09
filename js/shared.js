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

  let bg = document.getElementById('mgp-game-bg');
  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'mgp-game-bg';
    document.body.insertAdjacentElement('afterbegin', bg);
  }
  bg.style.cssText = `position:fixed;inset:0;z-index:0;pointer-events:none;background:${theme.bg};`;

  let scatter = document.getElementById('mgp-emoji-scatter');
  if (!scatter) {
    scatter = document.createElement('div');
    scatter.id = 'mgp-emoji-scatter';
    scatter.setAttribute('aria-hidden', 'true');
    document.body.insertAdjacentElement('afterbegin', scatter);
  }
  let scatterHTML = '';
  const positions = [
    { top:'2%',left:'2%',size:'5rem',rotate:-15,delay:0,dur:5 },
    { top:'5%',right:'3%',size:'4.5rem',rotate:12,delay:1,dur:7 },
    { top:'14%',left:'1%',size:'3.8rem',rotate:-22,delay:2.5,dur:6 },
    { top:'12%',right:'1%',size:'4.2rem',rotate:20,delay:0.5,dur:8 },
    { top:'26%',left:'3%',size:'3.5rem',rotate:-10,delay:3,dur:5.5 },
    { top:'30%',right:'2%',size:'5rem',rotate:18,delay:1.8,dur:7.5 },
    { top:'40%',left:'1%',size:'4rem',rotate:-28,delay:0.3,dur:6.5 },
    { top:'44%',right:'3%',size:'3.6rem',rotate:14,delay:2.2,dur:5 },
    { top:'55%',left:'2%',size:'4.8rem',rotate:-8,delay:1.5,dur:8 },
    { top:'58%',right:'1%',size:'4.2rem',rotate:25,delay:3.5,dur:6 },
    { top:'68%',left:'3%',size:'3.5rem',rotate:-18,delay:0.8,dur:7 },
    { top:'72%',right:'2%',size:'4rem',rotate:12,delay:2.8,dur:5.5 },
    { top:'82%',left:'1%',size:'4.5rem',rotate:-14,delay:1.2,dur:6.5 },
    { top:'86%',right:'3%',size:'3.8rem',rotate:22,delay:3.2,dur:7.5 },
    { top:'94%',left:'4%',size:'3.2rem',rotate:-20,delay:0.6,dur:5 },
    { top:'96%',right:'4%',size:'3.5rem',rotate:16,delay:2,dur:8 },
    { top:'8%',left:'6%',size:'6.5rem',rotate:-5,delay:1.5,dur:9 },
    { top:'35%',right:'5%',size:'6rem',rotate:8,delay:0.4,dur:8.5 },
    { top:'62%',left:'5%',size:'7rem',rotate:-12,delay:2.6,dur:10 },
    { top:'90%',right:'6%',size:'5.5rem',rotate:10,delay:1,dur:7 },
  ];
  const allEmojis = [gameEmoji, gameEmoji, gameEmoji, gameEmoji, ...vibeEmojis];
  positions.forEach((pos, i) => {
    const emoji = allEmojis[i % allEmojis.length];
    const posX = pos.left ? 'left:'+pos.left : 'right:'+pos.right;
    const posStyle = `top:${pos.top};${posX};font-size:${pos.size};--mgp-r:${pos.rotate}deg;animation-delay:${pos.delay}s;animation-duration:${pos.dur}s;`;
    scatterHTML += `<span class="mgp-scatter-emoji" style="${posStyle}">${emoji}</span>`;
  });
  scatter.innerHTML = scatterHTML;

  let banner = document.getElementById('mgp-emoji-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'mgp-emoji-banner';
    banner.setAttribute('aria-hidden', 'true');
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.insertAdjacentElement('afterbegin', banner);
  }
  if (banner) {
    const bannerEmojis = [gameEmoji, ...vibeEmojis.slice(0,5), gameEmoji];
    banner.innerHTML = bannerEmojis.map(e => `<span class="mgp-banner-e">${e}</span>`).join('');
  }

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
    body.mgp-themed-page > article,
    body.mgp-themed-page > section:not(#nav-container):not(#footer-container):not(#related-games),
    body.mgp-themed-page > div.max-w-3xl,
    body.mgp-themed-page > div.max-w-2xl,
    body.mgp-themed-page > div.max-w-4xl,
    body.mgp-themed-page main ~ article,
    body.mgp-themed-page main ~ section:not(#related-games),
    body.mgp-themed-page main ~ div:not(#related-games):not(#footer-container):not(#nav-container):not(#mgp-game-bg):not(#mgp-emoji-scatter)`;
  const CONTENT_STAR = CONTENT.split(',').map(s => s.trim() + ' *').join(',\n    ');

  style.textContent = `
    body.mgp-themed-page { background: #0f172a !important; }

    /* ── Emoji scatter ── */
    #mgp-emoji-scatter {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
    }
    .mgp-scatter-emoji {
      position: absolute;
      opacity: 0.22;
      filter: saturate(1.6) brightness(1.2);
      animation: mgpFloat 6s ease-in-out infinite;
      line-height: 1;
      transform: rotate(var(--mgp-r, 0deg));
    }
    @keyframes mgpFloat {
      0%, 100% { transform: translateY(0) rotate(var(--mgp-r, 0deg)) scale(1); }
      50% { transform: translateY(-14px) rotate(var(--mgp-r, 0deg)) scale(1.08); }
    }

    /* ── Emoji banner above game ── */
    #mgp-emoji-banner {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 10px 0 6px;
      position: relative;
      z-index: 2;
    }
    .mgp-banner-e {
      font-size: 2rem;
      animation: mgpPop 2s ease-in-out infinite;
      display: inline-block;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.3));
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
      50% { transform: scale(1.2) translateY(-6px); }
    }

    /* ── Z-index layering ── */
    body.mgp-themed-page > *:not(#mgp-game-bg):not(#mgp-emoji-scatter) {
      position: relative; z-index: 1;
    }

    /* ── Make game areas BIGGER ── */
    body.mgp-themed-page main {
      max-width: 1280px !important;
      width: 100% !important;
      padding-left: 16px !important;
      padding-right: 16px !important;
    }
    body.mgp-themed-page main > div:first-child,
    body.mgp-themed-page main > .card:first-child,
    body.mgp-themed-page main > article:first-child {
      max-width: 100% !important;
      width: 100% !important;
    }
    body.mgp-themed-page canvas {
      max-width: 95vw !important;
      width: 100% !important;
      height: auto !important;
      min-height: 300px;
      border: 3px solid rgba(${C}, 0.6) !important;
      box-shadow:
        0 0 50px -5px rgba(${C}, 0.5),
        0 0 100px -20px rgba(${C}, 0.3),
        0 16px 40px -12px rgba(0,0,0,0.5) !important;
      border-radius: 16px !important;
    }
    body.mgp-themed-page [style*="max-width: 700"],
    body.mgp-themed-page [style*="max-width:700"],
    body.mgp-themed-page #game-canvas {
      max-width: 900px !important;
    }
    body.mgp-themed-page #sudoku-grid {
      max-width: 480px !important;
    }
    body.mgp-themed-page [class*="max-w-\\[min(90vw"] {
      max-width: min(90vw, 540px) !important;
    }

    /* ── Widen articles outside main ── */
    body.mgp-themed-page > article,
    body.mgp-themed-page main ~ article {
      max-width: 960px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    /* ── Nav & Footer ── */
    body.mgp-themed-page #nav-container nav {
      background: rgba(255,255,255,0.97) !important;
      border-bottom: 3px solid rgba(${C},0.5) !important;
    }
    body.mgp-themed-page #footer-container footer {
      background: rgba(0,0,0,0.5) !important;
      border-color: rgba(${C},0.3) !important;
    }
    body.mgp-themed-page #footer-container footer span,
    body.mgp-themed-page #footer-container footer a,
    body.mgp-themed-page #footer-container footer button {
      color: rgba(255,255,255,0.7) !important;
    }

    /* ── Content cards ── */
    ${CONTENT} {
      background: #ffffff !important;
      color: #0F172A !important;
      border: 2px solid rgba(${C}, 0.35) !important;
      border-radius: 20px !important;
      box-shadow:
        0 20px 60px -15px rgba(0,0,0,0.5),
        0 0 0 1px rgba(255,255,255,0.15),
        0 0 80px -20px rgba(${C}, 0.35) !important;
      padding: 24px !important;
      margin-bottom: 20px !important;
    }
    ${CONTENT_STAR} { color: inherit; }
    body.mgp-themed-page main h1, body.mgp-themed-page main h2, body.mgp-themed-page main h3,
    body.mgp-themed-page > article h1, body.mgp-themed-page > article h2, body.mgp-themed-page > article h3,
    body.mgp-themed-page main ~ article h1, body.mgp-themed-page main ~ article h2, body.mgp-themed-page main ~ article h3 { color: #0F172A !important; }
    body.mgp-themed-page main p, body.mgp-themed-page > article p, body.mgp-themed-page main ~ article p,
    body.mgp-themed-page main ~ section p, body.mgp-themed-page main ~ div p { color: #334155 !important; }
    body.mgp-themed-page main a, body.mgp-themed-page > article a, body.mgp-themed-page main ~ article a { color: rgb(${C}) !important; }
    body.mgp-themed-page main code, body.mgp-themed-page > article code, body.mgp-themed-page main ~ article code { background:#F1F5F9!important; color:#334155!important; }
    body.mgp-themed-page main li, body.mgp-themed-page > article li, body.mgp-themed-page main ~ article li,
    body.mgp-themed-page main ~ section li, body.mgp-themed-page main ~ div li { color: #334155 !important; }

    /* ── Related games ── */
    body.mgp-themed-page #related-games {
      background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important;
      max-width: 1280px !important;
    }
    body.mgp-themed-page #related-games > section {
      background: rgba(255,255,255,0.97) !important;
      border: 2px solid rgba(${C},0.25) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 50px -16px rgba(0,0,0,0.45) !important;
    }
    body.mgp-themed-page #related-games h3 { color: #0F172A !important; }

    /* ── Buttons get flair ── */
    body.mgp-themed-page main button,
    body.mgp-themed-page main [role="button"] {
      border-radius: 12px !important;
      font-weight: 600 !important;
      transition: transform 0.15s, box-shadow 0.15s !important;
    }
    body.mgp-themed-page main button:hover,
    body.mgp-themed-page main [role="button"]:hover {
      transform: translateY(-2px) scale(1.03) !important;
      box-shadow: 0 6px 20px -4px rgba(${C},0.5) !important;
    }
    body.mgp-themed-page main button:active,
    body.mgp-themed-page main [role="button"]:active {
      transform: scale(0.97) !important;
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .mgp-scatter-emoji { opacity: 0.15; }
      .mgp-banner-e { font-size: 1.6rem; }
      body.mgp-themed-page main {
        padding-left: 8px !important;
        padding-right: 8px !important;
      }
      ${CONTENT} {
        padding: 14px !important;
        border-radius: 14px !important;
      }
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
