// MiniGamePlanet — Shared UI Chrome (Nav, Footer, Related Games)
// Renders Design System-compliant nav, footer, and related game tiles.

import { games, categories } from '/data/games.js';
import { muteAll, isMuted, initAudio } from '/js/audio.js';
import { openConsentBanner } from '/js/consent.js';

function getCategoryAccent(catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.accent : '#64748B';
}

function getCategoryIcon(catName) {
  const cat = categories.find(c => c.name === catName);
  return cat ? cat.icon : '🎮';
}

// ─── NAV ────────────────────────────────────────────────────────

function renderNav(gameName) {
  const el = document.getElementById('nav-container');
  if (!el) return;

  el.innerHTML = `
    <nav style="position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:2px solid #0F172A;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;max-width:100%;">
      <a href="/" style="display:flex;align-items:center;gap:6px;text-decoration:none;">
        <span style="font-size:20px;">🎮</span>
        <span style="font-weight:700;font-size:16px;color:#0F172A;">MiniGame</span><span class="hero-grad" style="font-weight:700;font-size:16px;">Planet</span>
      </a>
      <div style="display:flex;align-items:center;gap:16px;">
        <a href="/blog" style="font-size:12px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Blog</a>
        <a href="/about" style="font-size:12px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">About</a>
        <a href="/privacy" style="font-size:12px;font-weight:500;color:#94A3B8;text-decoration:none;transition:color 0.15s;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Privacy</a>
        <button id="sound-toggle-nav" style="background:#0F172A;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:4px;">
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
    <footer style="border-top:2px solid #0F172A;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;max-width:100%;">
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#64748B;">
        <span>🎮</span>
        <span>MiniGamePlanet &copy; 2025</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <a href="/sitemap.xml" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Sitemap</a>
        <a href="/blog" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Blog</a>
        <a href="/about" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">About</a>
        <a href="/privacy" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Privacy</a>
        <a href="/terms" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Terms</a>
        <a href="/cookies" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Cookies</a>
        <a href="/licenses" style="font-size:11px;color:#94A3B8;text-decoration:none;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Licenses</a>
        <button id="footer-cookie-settings" style="font-size:11px;color:#94A3B8;background:none;border:none;cursor:pointer;padding:0;font-family:inherit;text-decoration:underline;" onmouseover="this.style.color='#0F172A'" onmouseout="this.style.color='#94A3B8'">Cookie Settings</button>
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
        position:relative;overflow:hidden;border-radius:12px;height:160px;
        background:${accent};cursor:pointer;transition:transform 0.16s ease, box-shadow 0.16s ease;
      " onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px ${accent}55';" onmouseout="this.style.transform='';this.style.boxShadow='';">
        <div style="position:absolute;bottom:-10px;right:-10px;font-size:120px;opacity:0.1;transform:rotate(-12deg);line-height:1;transition:opacity 0.2s,transform 0.2s;" class="tile-bg-emoji">${g.icon}</div>
        <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 100%);pointer-events:none;"></div>
        <div style="position:absolute;bottom:12px;left:12px;right:12px;z-index:1;">
          <div style="font-size:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));margin-bottom:4px;">${g.icon}</div>
          <div style="color:#fff;font-weight:700;font-size:15px;text-shadow:0 1px 3px rgba(0,0,0,0.3);line-height:1.2;">${g.name}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">
            <span style="color:rgba(255,255,255,0.7);font-size:10px;">${g.category}</span>
            <span class="tile-play-cta" style="color:#fff;font-size:10px;font-weight:900;opacity:0;transform:translateX(-8px);transition:opacity 0.15s,transform 0.15s;">PLAY →</span>
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
}

export { renderNav, renderFooter, renderRelatedGames, buildGameCard, games, categories, getCategoryAccent, getCategoryIcon, shuffleArray };
