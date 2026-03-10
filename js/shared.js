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
  upsertLink({ rel: 'manifest', href: '/manifest.json' });
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

  const oldBanner = document.getElementById('mgp-emoji-banner');
  if (oldBanner) oldBanner.remove();

  const bannerEmojis = [gameEmoji, ...vibeEmojis.slice(0,5), gameEmoji];
  const emojiHTML = bannerEmojis.map(e => `<span class="mgp-banner-e">${e}</span>`).join('');

  function placeEmojis(id, insertFn) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      insertFn(el);
    }
    el.innerHTML = emojiHTML;
  }

  const h1 = document.querySelector('main h1, body > div h1, article h1');
  if (h1) {
    placeEmojis('mgp-header-emojis', (el) => {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        mainEl.insertAdjacentElement('afterbegin', el);
      } else {
        h1.parentElement.insertAdjacentElement('beforebegin', el);
      }
    });

    placeEmojis('mgp-footer-emojis', (el) => {
      const mainEl = document.querySelector('main');
      const gameCard = mainEl && (mainEl.querySelector(':scope > div') || mainEl.querySelector(':scope > article') || mainEl);
      if (gameCard) {
        const disclaimer = gameCard.querySelector('[style*="background:#FEF3C7"], .bg-amber-50');
        if (disclaimer) disclaimer.insertAdjacentElement('beforebegin', el);
        else gameCard.appendChild(el);
      }
    });
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

    /* ── Animated emojis ── */
    #mgp-header-emojis,
    #mgp-footer-emojis {
      display: flex;
      align-items: center;
      gap: clamp(5px, 1.2vw, 10px);
      justify-content: center;
      overflow: visible;
      padding: 6px 0;
      pointer-events: none;
    }
    #mgp-header-emojis {
      position: static;
      width: 100%;
      justify-content: center;
    }
    #mgp-footer-emojis {
      margin: 12px auto 4px;
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

    /* ── Z-index layering ── */
    body.mgp-themed-page > *:not(#mgp-game-bg):not(#mgp-emoji-scatter) {
      position: relative; z-index: 1;
    }

    /* ── Overflow protection ── */
    body.mgp-themed-page,
    body.mgp-themed-page main,
    body.mgp-themed-page main > div,
    body.mgp-themed-page main > article,
    body.mgp-themed-page > article {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }
    body.mgp-themed-page *, body.mgp-themed-page *::before, body.mgp-themed-page *::after {
      box-sizing: border-box !important;
    }

    /* ── Make game areas THE MAIN EVENT ── */
    body.mgp-themed-page main {
      max-width: min(100vw, 1400px) !important;
      width: 100% !important;
      padding: 8px !important;
      margin-top: 0 !important;
    }
    body.mgp-themed-page main > div:first-child,
    body.mgp-themed-page main > .card:first-child,
    body.mgp-themed-page main > article:first-child {
      max-width: 100% !important;
      width: 100% !important;
      overflow-x: auto !important;
    }
    /* Compact disclaimers - push below the game */
    body.mgp-themed-page .bg-amber-50,
    body.mgp-themed-page [style*="background:#FEF3C7"],
    body.mgp-themed-page [style*="background: #FEF3C7"] {
      order: 99 !important;
      padding: 8px 12px !important;
      font-size: 12px !important;
      margin-top: 12px !important;
      margin-bottom: 0 !important;
    }
    /* How-to-Play articles: compact, below fold */
    body.mgp-themed-page > article,
    body.mgp-themed-page main ~ article,
    body.mgp-themed-page main + article {
      margin-top: 8px !important;
      padding: 16px !important;
      font-size: 14px !important;
    }
    body.mgp-themed-page > article h2,
    body.mgp-themed-page main ~ article h2 {
      font-size: 18px !important;
      margin-bottom: 8px !important;
    }

    /* ── CARD GAMES: Centering + wrapping for card hands ── */
    body.mgp-themed-page #dealer-hand,
    body.mgp-themed-page #player-hand,
    body.mgp-themed-page #cpu-hand,
    body.mgp-themed-page #player-cards,
    body.mgp-themed-page #cpu-cards,
    body.mgp-themed-page .hand,
    body.mgp-themed-page [id*="-hand"] {
      justify-content: center !important;
      flex-wrap: wrap !important;
    }

    /* Blackjack PLAYING cards only (not layout .card wrappers) */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card.deal,
    body.mgp-themed-page [id*="-hand"] > .card {
      width: clamp(76px, 15vw, 120px) !important;
      height: clamp(110px, 22vw, 172px) !important;
      font-size: clamp(24px, 4.5vw, 38px) !important;
      border-radius: 14px !important;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25), 0 0 15px rgba(${C}, 0.15) !important;
      margin: 0 clamp(-6px, -0.8vw, -3px) !important;
    }
    body.mgp-themed-page .card.red > span,
    body.mgp-themed-page .card.black > span,
    body.mgp-themed-page [id*="-hand"] > .card > span {
      font-size: clamp(20px, 3.5vw, 32px) !important;
    }
    body.mgp-themed-page .card.red > span[style*="font-size:12px"],
    body.mgp-themed-page .card.black > span[style*="font-size:12px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 12px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 12px"] {
      font-size: clamp(16px, 2.8vw, 24px) !important;
    }
    body.mgp-themed-page .card.red > span[style*="font-size:22px"],
    body.mgp-themed-page .card.black > span[style*="font-size:22px"],
    body.mgp-themed-page .card.red > span[style*="font-size:18px"],
    body.mgp-themed-page .card.black > span[style*="font-size:18px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 22px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 22px"],
    body.mgp-themed-page .card.red > span[style*="font-size: 18px"],
    body.mgp-themed-page .card.black > span[style*="font-size: 18px"] {
      font-size: clamp(26px, 5vw, 42px) !important;
    }
    body.mgp-themed-page .card.facedown::after {
      font-size: clamp(36px, 7vw, 56px) !important;
    }
    /* All card inline span text across all games */
    body.mgp-themed-page .ce-card > span,
    body.mgp-themed-page .pile-card > span {
      font-size: clamp(16px, 2.8vw, 26px) !important;
    }
    body.mgp-themed-page .ce-card > span[style*="font-size:18px"],
    body.mgp-themed-page .ce-card > span[style*="font-size: 18px"],
    body.mgp-themed-page .pile-card > span[style*="font-size:22px"],
    body.mgp-themed-page .pile-card > span[style*="font-size: 22px"] {
      font-size: clamp(22px, 4vw, 36px) !important;
    }

    /* Solitaire .card-el / .slot (62x88 -> 100x142) */
    body.mgp-themed-page .card-el,
    body.mgp-themed-page .slot {
      width: clamp(60px, 12vw, 100px) !important;
      height: clamp(86px, 17vw, 142px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .card-rank { font-size: clamp(14px, 2.4vw, 20px) !important; }
    body.mgp-themed-page .card-suit { font-size: clamp(18px, 3.2vw, 28px) !important; }

    /* Spider Solitaire .card-s (58x82 -> 96x136) */
    body.mgp-themed-page .card-s {
      width: clamp(56px, 11vw, 96px) !important;
      height: clamp(80px, 16vw, 136px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .card-s .r { font-size: clamp(12px, 2vw, 18px) !important; }
    body.mgp-themed-page .card-s .st { font-size: clamp(16px, 2.8vw, 24px) !important; }

    /* FreeCell .card-f / .slot-f (60x84 -> 98x138) */
    body.mgp-themed-page .card-f,
    body.mgp-themed-page .slot-f {
      width: clamp(58px, 11.5vw, 98px) !important;
      height: clamp(82px, 16.5vw, 138px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .card-f .rk { font-size: clamp(12px, 2vw, 18px) !important; }
    body.mgp-themed-page .card-f .su { font-size: clamp(16px, 2.8vw, 24px) !important; }

    /* Crazy Eights .ce-card (56x80 -> 90x128) */
    body.mgp-themed-page .ce-card {
      width: clamp(54px, 11vw, 90px) !important;
      height: clamp(76px, 15.5vw, 128px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .pile-card,
    body.mgp-themed-page #draw-pile {
      width: clamp(62px, 12.5vw, 105px) !important;
      height: clamp(88px, 17.5vw, 148px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .suit-btn {
      width: clamp(40px, 7vw, 56px) !important;
      height: clamp(40px, 7vw, 56px) !important;
      font-size: clamp(20px, 3.5vw, 30px) !important;
    }

    /* War .wc (72x104 -> 125x180) */
    body.mgp-themed-page .wc {
      width: clamp(76px, 15vw, 125px) !important;
      height: clamp(110px, 22vw, 180px) !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
    }
    body.mgp-themed-page .wc .rk { font-size: clamp(16px, 3vw, 24px) !important; }
    body.mgp-themed-page .wc .st { font-size: clamp(28px, 5vw, 42px) !important; }

    /* Go Fish .gf-card (52x74 -> 82x116) */
    body.mgp-themed-page .gf-card {
      width: clamp(50px, 10vw, 82px) !important;
      height: clamp(70px, 14vw, 116px) !important;
      font-size: clamp(13px, 2.2vw, 18px) !important;
      border-radius: 10px !important;
    }
    body.mgp-themed-page .gf-back {
      width: clamp(42px, 7.5vw, 64px) !important;
      height: clamp(58px, 10.5vw, 88px) !important;
      border-radius: 8px !important;
    }

    /* Video Poker .vp-card (72x104 -> 110x158) */
    body.mgp-themed-page .vp-card {
      width: clamp(68px, 13vw, 110px) !important;
      height: clamp(98px, 19vw, 158px) !important;
      border-radius: 12px !important;
    }
    body.mgp-themed-page .vp-card .rank { font-size: clamp(14px, 2.5vw, 22px) !important; }
    body.mgp-themed-page .vp-card .suit { font-size: clamp(22px, 4vw, 34px) !important; }

    /* High-Low .hl-card (80x116 -> 120x174) */
    body.mgp-themed-page .hl-card {
      width: clamp(76px, 14vw, 120px) !important;
      height: clamp(110px, 21vw, 174px) !important;
      border-radius: 12px !important;
    }
    body.mgp-themed-page .hl-card .rk { font-size: clamp(18px, 3vw, 28px) !important; }
    body.mgp-themed-page .hl-card .st { font-size: clamp(28px, 5vw, 42px) !important; }

    /* Dominoes .domino-tile */
    body.mgp-themed-page .domino-tile {
      width: clamp(44px, 7vw, 60px) !important;
      height: clamp(88px, 14vw, 120px) !important;
    }

    /* ── DISCLAIMER / ENTERTAINMENT BOXES (box styling only, text in Layer 3) ── */
    body.mgp-themed-page [style*="background:#FEF3C7"],
    body.mgp-themed-page [style*="background: #FEF3C7"],
    body.mgp-themed-page .bg-amber-50 {
      background: #FEF3C7 !important;
      border: 2px solid #FCD34D !important;
      border-radius: 12px !important;
      padding: 14px 18px !important;
    }

    /* ── ALL GAME BUTTONS: Bigger + exciting ── */
    body.mgp-themed-page .action-btn,
    body.mgp-themed-page .bet-btn,
    body.mgp-themed-page .btn-f,
    body.mgp-themed-page .guess-btn,
    body.mgp-themed-page .mode-btn {
      padding: clamp(12px, 2vw, 20px) clamp(24px, 4vw, 48px) !important;
      font-size: clamp(15px, 2.2vw, 20px) !important;
      font-weight: 700 !important;
      border-radius: 14px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    

    /* ── BOARD GAMES: Bigger boards ── */
    body.mgp-themed-page #chess-board {
      max-width: min(92vw, 600px) !important; width: min(92vw, 600px) !important;
    }
    body.mgp-themed-page .chess-piece {
      font-size: clamp(2rem, 6vw, 4.5rem) !important;
    }
    body.mgp-themed-page #board[class*="w-72"],
    body.mgp-themed-page #board[class*="w-80"] {
      width: min(92vw, 520px) !important; height: min(92vw, 520px) !important;
    }
    body.mgp-themed-page [class*="text-4xl"][class*="md\\:text-5xl"] {
      font-size: clamp(2.5rem, 6vw, 4rem) !important;
    }
    body.mgp-themed-page [class*="w-\\[min(90vw"] {
      max-width: min(92vw, 600px) !important; width: min(92vw, 600px) !important;
    }

    /* ── PUZZLE GAMES: Bigger grids ── */
    body.mgp-themed-page #sudoku-grid {
      max-width: min(92vw, 560px) !important; width: min(92vw, 560px) !important;
    }
    body.mgp-themed-page .su-cell {
      font-size: clamp(16px, 3vw, 24px) !important;
    }
    body.mgp-themed-page .su-note { font-size: clamp(7px, 1.2vw, 10px) !important; }
    body.mgp-themed-page .num-btn {
      width: clamp(34px, 6vw, 48px) !important; height: clamp(38px, 6.5vw, 52px) !important;
      font-size: clamp(16px, 2.5vw, 22px) !important;
    }
    body.mgp-themed-page #grid-container {
      max-width: 88vw !important; overflow-x: auto !important;
    }
    body.mgp-themed-page #board[style*="max-width:340px"],
    body.mgp-themed-page #board[style*="max-width: 340px"] {
      max-width: min(88vw, 440px) !important;
    }

    /* ── HANGMAN: Responsive ── */
    body.mgp-themed-page .hm-letter {
      font-size: clamp(22px, 4vw, 36px) !important; width: clamp(22px, 4vw, 36px) !important;
    }
    body.mgp-themed-page .kb-letter {
      width: clamp(32px, 5.5vw, 44px) !important; height: clamp(32px, 5.5vw, 44px) !important;
      font-size: clamp(13px, 2vw, 18px) !important;
    }
    body.mgp-themed-page #hangman-canvas {
      width: clamp(160px, 30vw, 240px) !important; height: clamp(160px, 30vw, 240px) !important;
    }

    /* ── MEMORY MATCH ── */
    body.mgp-themed-page .mm-card {
      min-width: 0 !important;
    }

    /* ── BLOCK PUZZLE (Tetris): Responsive ── */
    body.mgp-themed-page #gameCanvas[width="300"],
    body.mgp-themed-page canvas[width="300"][height="480"] {
      width: min(65vw, 360px) !important; height: min(104vw, 576px) !important;
    }
    body.mgp-themed-page #holdCanvas, body.mgp-themed-page #nextCanvas {
      width: min(18vw, 100px) !important; height: min(18vw, 100px) !important;
    }
    body.mgp-themed-page .touch-btn {
      width: clamp(44px, 8vw, 60px) !important; height: clamp(44px, 8vw, 60px) !important;
      font-size: clamp(18px, 3vw, 26px) !important;
    }

    /* ── SNAKE & square canvases ── */
    body.mgp-themed-page canvas[width="400"][height="400"] {
      width: min(88vw, 520px) !important; height: min(88vw, 520px) !important;
    }

    /* ── ALL GAMES: Bigger action buttons (not sound toggles or small toggles) ── */
    body.mgp-themed-page main button:not(#sound-toggle):not(#soundToggle):not(#sound-btn):not(.mode-btn) {
      min-height: 44px !important;
      font-weight: 700 !important;
    }

    /* ── Canvas: HERO size with neon glow ── */
    body.mgp-themed-page canvas {
      max-width: 94vw !important;
      width: 100% !important;
      border: 3px solid rgba(${C}, 0.7) !important;
      box-shadow:
        0 0 20px rgba(${C}, 0.6),
        0 0 60px rgba(${C}, 0.3),
        0 0 120px rgba(${C}, 0.15),
        0 16px 40px -12px rgba(0,0,0,0.6) !important;
      border-radius: 16px !important;
    }
    body.mgp-themed-page #game-canvas {
      max-width: min(94vw, 1000px) !important;
    }
    body.mgp-themed-page canvas[width="320"],
    body.mgp-themed-page canvas[width="300"],
    body.mgp-themed-page canvas[width="400"] {
      min-width: min(94vw, 500px) !important;
      min-height: min(60vh, 500px) !important;
    }

    /* ── SLOT MACHINE: handled by inline styles in slot-machine.html ── */

    /* ── ROULETTE WHEEL: bigger ── */
    body.mgp-themed-page #roulette-wheel,
    body.mgp-themed-page canvas[id*="roulette"] {
      min-width: min(90vw, 500px) !important;
      min-height: min(90vw, 500px) !important;
    }

    /* ── Game area centering + styling ── */
    body.mgp-themed-page [style*="background:#0F4C3A"],
    body.mgp-themed-page [style*="background:#0F6B3A"],
    body.mgp-themed-page [style*="background:#0f4c3a"],
    body.mgp-themed-page [style*="background:#0f6b3a"],
    body.mgp-themed-page #game-area,
    body.mgp-themed-page #battle-area {
      border-radius: 20px !important;
      padding: clamp(20px, 4vw, 36px) !important;
      text-align: center !important;
      box-shadow:
        inset 0 0 40px rgba(0,0,0,0.2),
        0 0 30px rgba(${C}, 0.2),
        0 12px 40px rgba(0,0,0,0.3) !important;
      border: 2px solid rgba(255,255,255,0.1) !important;
    }
    body.mgp-themed-page [style*="background:#0F4C3A"] > div,
    body.mgp-themed-page [style*="background:#0F6B3A"] > div,
    body.mgp-themed-page [style*="background:#0f4c3a"] > div,
    body.mgp-themed-page [style*="background:#0f6b3a"] > div,
    body.mgp-themed-page #game-area > div,
    body.mgp-themed-page #battle-area > div {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
    }
    body.mgp-themed-page [style*="display:flex"][style*="min-height"],
    body.mgp-themed-page [id$="-hand"],
    body.mgp-themed-page [id$="-cards"] {
      justify-content: center !important;
    }
    /* Center all game content sections */
    body.mgp-themed-page main > div > div:first-child {
      position: relative !important;
    }
    body.mgp-themed-page #bet-phase,
    body.mgp-themed-page #bet-preview-felt,
    body.mgp-themed-page [id*="phase"],
    body.mgp-themed-page [id*="result"],
    body.mgp-themed-page main > div > div[style*="text-align:center"],
    body.mgp-themed-page main > article > div[style*="text-align:center"] {
      text-align: center !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    /* Center flex containers with buttons/chips */
    body.mgp-themed-page main > div div[style*="display:flex"][style*="justify-content:center"],
    body.mgp-themed-page main > article div[style*="display:flex"][style*="justify-content:center"] {
      justify-content: center !important;
      align-items: center !important;
    }
    /* Center all canvases */
    body.mgp-themed-page main canvas {
      display: block !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    /* ── ANIMATIONS: Playing cards, buttons, cells ── */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card-el,
    body.mgp-themed-page .card-s,
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
      transition: transform 0.2s ease, box-shadow 0.2s ease !important;
      cursor: pointer;
    }
    body.mgp-themed-page .card.red:hover,
    body.mgp-themed-page .card.black:hover,
    body.mgp-themed-page .card.facedown:hover,
    body.mgp-themed-page .card-el:hover,
    body.mgp-themed-page .card-s:hover,
    body.mgp-themed-page .card-f:hover,
    body.mgp-themed-page .ce-card:hover,
    body.mgp-themed-page .gf-card:hover,
    body.mgp-themed-page .vp-card:hover,
    body.mgp-themed-page .hl-card:hover,
    body.mgp-themed-page .mm-card:hover {
      transform: translateY(-8px) scale(1.08) !important;
      box-shadow: 0 16px 32px -4px rgba(0,0,0,0.35) !important;
      z-index: 10 !important;
    }
    body.mgp-themed-page .su-cell,
    body.mgp-themed-page .cell,
    body.mgp-themed-page .chess-square,
    body.mgp-themed-page .kb-letter,
    body.mgp-themed-page .num-btn,
    body.mgp-themed-page .suit-btn {
      transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease !important;
      cursor: pointer;
    }
    body.mgp-themed-page .su-cell:hover,
    body.mgp-themed-page .cell:hover,
    body.mgp-themed-page .chess-square:hover {
      transform: scale(1.08) !important;
      box-shadow: 0 0 12px rgba(${C}, 0.4) !important;
      z-index: 5 !important;
    }
    body.mgp-themed-page .kb-letter:hover,
    body.mgp-themed-page .num-btn:hover,
    body.mgp-themed-page .suit-btn:hover {
      transform: scale(1.12) !important;
      box-shadow: 0 4px 16px rgba(${C}, 0.4) !important;
    }
    body.mgp-themed-page .kb-letter:active,
    body.mgp-themed-page .num-btn:active,
    body.mgp-themed-page .suit-btn:active,
    body.mgp-themed-page .su-cell:active,
    body.mgp-themed-page .cell:active {
      transform: scale(0.92) !important;
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
      animation: mgpBtnPulse 2s ease-in-out infinite !important;
    }
    @keyframes mgpBtnPulse {
      0%, 100% { box-shadow: 0 4px 16px rgba(${C}, 0.3); }
      50% { box-shadow: 0 4px 16px rgba(${C}, 0.3), 0 0 30px rgba(${C}, 0.4); }
    }

    /* ── Widen articles outside main ── */
    body.mgp-themed-page > article,
    body.mgp-themed-page main ~ article {
      max-width: min(92vw, 1100px) !important;
      margin-left: auto !important;
      margin-right: auto !important;
      overflow-x: hidden !important;
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

    /* ── Wrapper divs around main should be transparent, not cards ── */
    body.mgp-themed-page > div:not(#nav-container):not(#footer-container):not(#related-games):not(#mgp-game-bg):not(#mgp-emoji-scatter) {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      max-width: 100% !important;
    }

    /* ── Content cards ── */
    ${CONTENT} {
      background: #ffffff !important;
      color: #0F172A !important;
      border: 2px solid rgba(${C}, 0.5) !important;
      border-radius: 20px !important;
      box-shadow:
        0 0 30px -5px rgba(${C}, 0.4),
        0 0 80px -15px rgba(${C}, 0.25),
        0 20px 60px -15px rgba(0,0,0,0.5),
        0 0 0 1px rgba(255,255,255,0.15) !important;
      padding: 16px !important;
      margin-bottom: 12px !important;
      overflow-x: auto !important;
    }
    /* ── LAYER 1: Force dark readable text on ALL content areas ── */
    ${CONTENT} {
      color: #0F172A !important;
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
      color: #0F172A !important;
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
      color: #fff !important;
    }
    body.mgp-themed-page main > div a,
    body.mgp-themed-page > article a,
    body.mgp-themed-page main ~ article a { color: rgb(${C}) !important; }
    body.mgp-themed-page > article code,
    body.mgp-themed-page main ~ article code { background:#F1F5F9!important; color:#334155!important; }

    /* ── LAYER 2: White text ONLY inside truly dark-background game areas ── */
    body.mgp-themed-page [style*="background:#0F"] p,
    body.mgp-themed-page [style*="background:#0f"] p,
    body.mgp-themed-page [style*="background:#1E"] p,
    body.mgp-themed-page [style*="background:#1e"] p,
    body.mgp-themed-page [style*="background:#0F"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card),
    body.mgp-themed-page [style*="background:#0f"] div:not(.card):not(.card-el):not(.card-s):not(.card-f):not(.ce-card):not(.wc):not(.gf-card):not(.vp-card):not(.hl-card):not(.pile-card),
    body.mgp-themed-page [style*="background:#1E"] div,
    body.mgp-themed-page [style*="background:#1e"] div {
      color: rgba(255,255,255,0.95) !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
    }
    body.mgp-themed-page [style*="background:#0F"] span:not([style*="color:"]),
    body.mgp-themed-page [style*="background:#0f"] span:not([style*="color:"]),
    body.mgp-themed-page [style*="background:#0F"] strong,
    body.mgp-themed-page [style*="background:#0f"] strong,
    body.mgp-themed-page [style*="background:#0F"] label,
    body.mgp-themed-page [style*="background:#0f"] label,
    body.mgp-themed-page [style*="background:#1E"] span:not([style*="color:"]),
    body.mgp-themed-page [style*="background:#1e"] span:not([style*="color:"]) {
      color: rgba(255,255,255,0.85) !important;
      text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
    }
    /* Inline-colored spans inside dark areas keep their color, just get shadow */
    body.mgp-themed-page [style*="background:#0F"] span[style*="color:"],
    body.mgp-themed-page [style*="background:#0f"] span[style*="color:"] {
      text-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
    }

    /* Overlay elements (game-over screens etc.) keep white text */
    body.mgp-themed-page [class*="bg-black"] p,
    body.mgp-themed-page [class*="bg-black"] span,
    body.mgp-themed-page [class*="bg-black"] button,
    body.mgp-themed-page .absolute.inset-0 p,
    body.mgp-themed-page .absolute.inset-0 span {
      color: inherit !important;
    }

    /* ── LAYER 2.5: Preserve playing card colors ── */
    body.mgp-themed-page .card.red,
    body.mgp-themed-page .card.red span { color: #DC2626 !important; text-shadow: none !important; }
    body.mgp-themed-page .card.black,
    body.mgp-themed-page .card.black span { color: #1E293B !important; text-shadow: none !important; }
    body.mgp-themed-page .card.facedown,
    body.mgp-themed-page .card.facedown span { color: transparent !important; text-shadow: none !important; }
    body.mgp-themed-page .ce-card span,
    body.mgp-themed-page .pile-card span,
    body.mgp-themed-page .card-el span,
    body.mgp-themed-page .card-s span,
    body.mgp-themed-page .card-f span,
    body.mgp-themed-page .wc span,
    body.mgp-themed-page .gf-card span,
    body.mgp-themed-page .vp-card span,
    body.mgp-themed-page .hl-card span { text-shadow: none !important; }
    body.mgp-themed-page button[style*="color:#fff"],
    body.mgp-themed-page button[style*="color: #fff"],
    body.mgp-themed-page button[style*="color:white"],
    body.mgp-themed-page .action-btn,
    body.mgp-themed-page .bet-btn { text-shadow: none !important; }

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
      color: #451A03 !important;
      -webkit-text-fill-color: #451A03 !important;
      font-size: clamp(13px, 2vw, 15px) !important;
      font-weight: 700 !important;
      text-transform: none !important;
      letter-spacing: normal !important;
      text-shadow: none !important;
    }

    /* ── Related games ── */
    body.mgp-themed-page #related-games {
      background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important;
      max-width: min(100vw, 1280px) !important;
      overflow-x: hidden !important;
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
    body.mgp-themed-page main [role="button"],
    body.mgp-themed-page > article button,
    body.mgp-themed-page main ~ article button {
      border-radius: 12px !important;
      font-weight: 600 !important;
      min-height: 44px !important;
      transition: transform 0.15s, box-shadow 0.15s, background-color 0.15s !important;
    }
    body.mgp-themed-page main button:hover,
    body.mgp-themed-page main [role="button"]:hover {
      transform: translateY(-3px) scale(1.05) !important;
      box-shadow: 0 8px 24px -4px rgba(${C},0.5) !important;
    }
    body.mgp-themed-page main button:active,
    body.mgp-themed-page main [role="button"]:active {
      transform: scale(0.95) !important;
    }

    /* ── Scoped Tailwind button overrides (buttons only) ── */
    body.mgp-themed-page main button.text-sm,
    body.mgp-themed-page main select.text-sm {
      font-size: 15px !important;
    }
    body.mgp-themed-page main button.px-3,
    body.mgp-themed-page main select.px-3 {
      padding-left: 16px !important; padding-right: 16px !important;
    }
    body.mgp-themed-page main button.py-1,
    body.mgp-themed-page main select.py-1 {
      padding-top: 8px !important; padding-bottom: 8px !important;
    }
    body.mgp-themed-page main button.px-6 {
      padding-left: 28px !important; padding-right: 28px !important;
    }
    body.mgp-themed-page main button.py-2,
    body.mgp-themed-page main select.py-2 {
      padding-top: 12px !important; padding-bottom: 12px !important;
    }
    body.mgp-themed-page main button.py-3 {
      padding-top: 16px !important; padding-bottom: 16px !important;
    }

    /* ── Mobile: tablet ── */
    @media (max-width: 768px) {
      .mgp-scatter-emoji { opacity: 0.15; }
      .mgp-banner-e { font-size: 1rem; }
      #mgp-header-emojis { gap: 3px !important; }
      body.mgp-themed-page main {
        padding: 4px !important;
      }
      ${CONTENT} {
        padding: 12px !important;
        border-radius: 14px !important;
      }
    }
    /* ── Mobile: phone ── */
    @media (max-width: 480px) {
      .mgp-scatter-emoji { opacity: 0.10; font-size: 80% !important; }
      .mgp-banner-e { font-size: 0.85rem; }
      #mgp-header-emojis { gap: 2px !important; }
      body.mgp-themed-page main {
        padding: 2px !important;
      }
      ${CONTENT} {
        padding: 8px !important;
        border-radius: 12px !important;
      }
      body.mgp-themed-page .action-btn,
      body.mgp-themed-page .bet-btn {
        padding: 10px 20px !important; font-size: 14px !important;
      }
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

  if (el.tagName === 'NAV') {
    const wrapper = document.createElement('div');
    wrapper.id = 'nav-container';
    wrapper.innerHTML = navHTML;
    el.replaceWith(wrapper);
  } else {
    el.id = 'nav-container';
    el.innerHTML = navHTML;
  }

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

  if (el.tagName === 'FOOTER') {
    const wrapper = document.createElement('div');
    wrapper.id = 'footer-container';
    wrapper.innerHTML = footerHTML;
    el.replaceWith(wrapper);
  } else {
    el.innerHTML = footerHTML;
  }

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
