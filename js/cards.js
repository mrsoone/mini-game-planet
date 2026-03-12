/**
 * cards.js — Shared card rendering module for MiniGamePlanet
 * Premium playing card visuals with 3D flip, deal, and play animations.
 * Used by all card games.
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#DC2626', diamonds: '#DC2626', clubs: '#1E293B', spades: '#1E293B' };

let _stylesInjected = false;

function injectCardStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'mgp-card-styles';
  style.textContent = `
    .mgp-card {
      width: clamp(56px, 9vw, 80px); height: clamp(80px, 13vw, 112px);
      border-radius: 8px; position: relative; cursor: pointer; flex-shrink: 0;
      perspective: 800px; user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease;
    }
    .mgp-card-inner {
      position: relative; width: 100%; height: 100%;
      transition: transform 0.3s ease;
      transform-style: preserve-3d;
    }
    .mgp-card.flipping .mgp-card-inner { transform: rotateY(90deg); }
    .mgp-card-face, .mgp-card-back-face {
      position: absolute; inset: 0; border-radius: 8px;
      backface-visibility: hidden; -webkit-backface-visibility: hidden;
    }
    .mgp-card-face {
      background: linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
      border: 1px solid #E5E7EB;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 4px 6px; overflow: hidden;
    }
    .mgp-card-back-face {
      background: linear-gradient(135deg, #1E3A5F 0%, #2D1B69 50%, #1E3A5F 100%);
      background-size: 100% 100%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1);
      border: 2px solid rgba(255,255,255,0.15);
    }
    .mgp-card-back-face::before {
      content: ''; position: absolute; inset: 0; border-radius: 6px;
      background: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 12px);
    }
    .mgp-card-back-face::after {
      content: ''; position: absolute; inset: 4px; border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: inset 0 1px 4px rgba(0,0,0,0.3);
    }
    .mgp-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }
    .mgp-card-selected {
      transform: translateY(-12px) !important;
    }
    .mgp-card-playable {
      animation: mgp-card-pulse 1.5s ease-in-out infinite;
    }
    .mgp-card-dimmed { opacity: 0.6; pointer-events: none; }
    @keyframes mgp-card-pulse {
      0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
      50% { box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 0 0 2px rgba(59,130,246,0.4); }
    }

    .mgp-card .rank {
      font-family: 'DM Mono', monospace; font-weight: 700;
      font-size: clamp(14px, 2.4vw, 20px); line-height: 1;
    }
    .mgp-card .suit-symbol {
      font-size: clamp(12px, 2vw, 16px); line-height: 1; margin-top: -1px;
    }
    .mgp-card .center-pip {
      font-size: clamp(24px, 4vw, 40px); line-height: 1;
    }

    .mgp-table-surface {
      background: linear-gradient(160deg, #1a5c35 0%, #0d4025 100%);
      border-radius: 16px; position: relative; overflow: hidden;
      box-shadow: inset 0 2px 12px rgba(0,0,0,0.3);
    }
    .mgp-table-surface::before {
      content: ''; position: absolute; inset: 0; border-radius: 16px;
      background: repeating-conic-gradient(rgba(255,255,255,0.015) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px;
      pointer-events: none;
    }

    .mgp-hand {
      display: flex; justify-content: center; align-items: flex-end;
      position: relative; min-height: 120px; padding: 8px 0;
    }
    .mgp-hand .mgp-card {
      transition: transform 0.15s ease, box-shadow 0.15s ease, margin-top 0.15s ease;
    }

    .mgp-opponent-hand {
      display: flex; justify-content: center; gap: -10px; padding: 8px 0;
    }
    .mgp-opponent-hand .mgp-card { transform: scale(0.7); margin-left: -16px; }
    .mgp-opponent-hand .mgp-card:first-child { margin-left: 0; }

    .mgp-pile-empty {
      width: clamp(56px, 9vw, 80px); height: clamp(80px, 13vw, 112px);
      border-radius: 8px; border: 2px dashed rgba(255,255,255,0.2);
    }

    .mgp-deal-in {
      animation: mgp-deal-slide 0.3s ease-out backwards;
    }
    @keyframes mgp-deal-slide {
      from { opacity: 0; transform: translateY(-40px) rotate(var(--deal-rot, 0deg)) scale(0.7); }
      to { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
    }
  `;
  document.head.appendChild(style);
}

export function createDeck(options = {}) {
  const { suits = 4, ranks = 13, includeJokers = false, deckCount = 1 } = options;
  const deck = [];
  for (let d = 0; d < deckCount; d++) {
    for (let s = 0; s < suits; s++) {
      for (let r = 0; r < ranks; r++) {
        deck.push({ suit: SUITS[s], rank: RANKS[r], id: `${RANKS[r]}-${SUITS[s]}-${d}` });
      }
    }
    if (includeJokers) {
      deck.push({ suit: 'joker', rank: 'JK', id: `joker-red-${d}` });
      deck.push({ suit: 'joker', rank: 'JK', id: `joker-black-${d}` });
    }
  }
  return shuffle(deck);
}

export function shuffle(arr) {
  const a = [...arr];
  const buf = new Uint32Array(a.length);
  crypto.getRandomValues(buf);
  for (let i = a.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardValue(card, aceHigh = true) {
  if (card.rank === 'A') return aceHigh ? 14 : 1;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  return parseInt(card.rank, 10);
}

export function cardPoints(card) {
  if (card.rank === 'A') return 15;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

export function renderCard(card, faceUp = true) {
  injectCardStyles();
  const el = document.createElement('div');
  el.className = 'mgp-card';
  el.dataset.cardId = card.id || `${card.rank}-${card.suit}`;
  el.dataset.suit = card.suit;
  el.dataset.rank = card.rank;
  el.dataset.faceUp = faceUp ? '1' : '0';

  const inner = document.createElement('div');
  inner.className = 'mgp-card-inner';

  const face = document.createElement('div');
  face.className = 'mgp-card-face';
  const color = SUIT_COLORS[card.suit] || '#1E293B';
  const sym = SUIT_SYMBOLS[card.suit] || '';
  face.style.color = color;
  face.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:flex-start;line-height:1;">
      <span class="rank">${card.rank}</span>
      <span class="suit-symbol">${sym}</span>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;">
      <span class="center-pip">${sym}</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1;transform:rotate(180deg);">
      <span class="rank">${card.rank}</span>
      <span class="suit-symbol">${sym}</span>
    </div>`;

  const back = document.createElement('div');
  back.className = 'mgp-card-back-face';

  inner.appendChild(face);
  inner.appendChild(back);
  el.appendChild(inner);

  if (!faceUp) {
    face.style.display = 'none';
    back.style.display = '';
  } else {
    face.style.display = '';
    back.style.display = 'none';
  }

  el.addEventListener('mouseenter', () => {
    if (!el.classList.contains('mgp-card-selected') && !el.classList.contains('mgp-card-dimmed')) {
      el.style.transform = 'translateY(-4px)';
      el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
    }
  });
  el.addEventListener('mouseleave', () => {
    if (!el.classList.contains('mgp-card-selected')) {
      el.style.transform = '';
      el.style.boxShadow = '';
    }
  });

  return el;
}

export function setCardSelected(el, selected, accentColor = '#3B82F6') {
  if (selected) {
    el.classList.add('mgp-card-selected');
    el.style.boxShadow = `0 0 0 3px ${accentColor}, 0 4px 12px rgba(0,0,0,0.15)`;
  } else {
    el.classList.remove('mgp-card-selected');
    el.style.transform = '';
    el.style.boxShadow = '';
  }
}

export function setCardPlayable(el, playable) {
  if (playable) {
    el.classList.add('mgp-card-playable');
    el.classList.remove('mgp-card-dimmed');
  } else {
    el.classList.remove('mgp-card-playable');
    el.classList.add('mgp-card-dimmed');
  }
}

export function renderHand(cards, options = {}) {
  injectCardStyles();
  const { spread = -20, selectable = false, onSelect = null, maxWidth = null, accentColor = '#3B82F6', arc = true } = options;
  const container = document.createElement('div');
  container.className = 'mgp-hand';
  if (maxWidth) container.style.maxWidth = maxWidth;

  const count = cards.length;
  const effectiveSpread = count > 10 ? Math.max(spread, -28) : spread;

  cards.forEach((card, i) => {
    const el = renderCard(card, true);
    el.style.marginLeft = i === 0 ? '0' : `${Math.max(effectiveSpread, -24)}px`;
    el.style.zIndex = i;

    if (arc && count > 2) {
      const mid = (count - 1) / 2;
      const norm = (i - mid) / Math.max(mid, 1);
      const rot = norm * 8;
      const lift = Math.abs(norm) * 8;
      el.style.transform = `rotate(${rot}deg)`;
      el.style.marginTop = `${lift}px`;

      el.addEventListener('mouseenter', () => {
        if (!el.classList.contains('mgp-card-selected')) {
          el.style.transform = 'translateY(-20px) rotate(0deg)';
          el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.18)';
          el.style.zIndex = '100';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (!el.classList.contains('mgp-card-selected')) {
          el.style.transform = `rotate(${rot}deg)`;
          el.style.boxShadow = '';
          el.style.zIndex = i;
        }
      });
    }

    if (selectable) {
      el.addEventListener('click', () => {
        const wasSelected = el.classList.contains('mgp-card-selected');
        setCardSelected(el, !wasSelected, accentColor);
        if (onSelect) onSelect(card, !wasSelected, el);
      });
    }

    container.appendChild(el);
  });

  return container;
}

export function renderOpponentHand(cardCount) {
  injectCardStyles();
  const container = document.createElement('div');
  container.className = 'mgp-opponent-hand';
  for (let i = 0; i < cardCount; i++) {
    const el = renderCard({ suit: 'spades', rank: 'A', id: `opp-${i}` }, false);
    container.appendChild(el);
  }
  const label = document.createElement('div');
  label.style.cssText = 'font-size:12px;color:#94A3B8;font-family:"DM Mono",monospace;text-align:center;margin-top:4px;';
  label.textContent = `Opponent: ${cardCount} cards`;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
  wrap.appendChild(container);
  wrap.appendChild(label);
  return wrap;
}

export function renderPile(cards, options = {}) {
  injectCardStyles();
  const { showCount = true, label = '', faceUp = false } = options;
  const container = document.createElement('div');
  container.className = 'mgp-pile';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

  if (cards.length > 0) {
    const topCard = renderCard(cards[cards.length - 1], faceUp);
    container.appendChild(topCard);
  } else {
    const empty = document.createElement('div');
    empty.className = 'mgp-pile-empty';
    container.appendChild(empty);
  }

  if (showCount || label) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:#94A3B8;font-family:"DM Mono",monospace;text-align:center;';
    info.textContent = label || `${cards.length} cards`;
    container.appendChild(info);
  }

  return container;
}

export function renderTrick(cardsPlayed, playerPositions = ['South', 'West', 'North', 'East']) {
  injectCardStyles();
  const container = document.createElement('div');
  container.className = 'mgp-trick';
  container.style.cssText = `display:grid;grid-template-areas:"t t t" "l c r" "b b b";
    grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto auto;
    gap:4px;justify-items:center;align-items:center;padding:12px;min-height:180px;`;

  const posMap = { North: 't', West: 'l', East: 'r', South: 'b' };
  const areas = { t: 'grid-area:t;', l: 'grid-area:l;', c: 'grid-area:c;', r: 'grid-area:r;', b: 'grid-area:b;' };

  playerPositions.forEach((pos, i) => {
    const slot = document.createElement('div');
    const area = posMap[pos] || 'c';
    slot.style.cssText = `${areas[area]};display:flex;flex-direction:column;align-items:center;gap:2px;`;

    if (cardsPlayed[i]) {
      const cardEl = renderCard(cardsPlayed[i], true);
      cardEl.style.transform = 'scale(0.9)';
      slot.appendChild(cardEl);
    }

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:10px;color:#94A3B8;font-family:"Space Grotesk",sans-serif;';
    lbl.textContent = pos;
    slot.appendChild(lbl);

    container.appendChild(slot);
  });

  return container;
}

export function flipCard(cardEl, playFlipSound) {
  return new Promise(resolve => {
    cardEl.classList.add('flipping');
    setTimeout(() => {
      const isFaceUp = cardEl.dataset.faceUp === '1';
      const face = cardEl.querySelector('.mgp-card-face');
      const back = cardEl.querySelector('.mgp-card-back-face');
      if (isFaceUp) {
        face.style.display = 'none';
        back.style.display = '';
        cardEl.dataset.faceUp = '0';
      } else {
        face.style.display = '';
        back.style.display = 'none';
        cardEl.dataset.faceUp = '1';
      }
      if (playFlipSound) playFlipSound();
      cardEl.classList.remove('flipping');
      setTimeout(resolve, 300);
    }, 150);
  });
}

export function animateCardDeal(cardElements, stagger = 100, playDealSound) {
  return new Promise(resolve => {
    cardElements.forEach((el, i) => {
      const rot = (Math.random() - 0.5) * 6;
      el.style.setProperty('--deal-rot', `${rot}deg`);
      el.style.opacity = '0';
      el.classList.remove('mgp-deal-in');
      setTimeout(() => {
        el.style.opacity = '';
        el.classList.add('mgp-deal-in');
        el.style.animationDelay = '0ms';
        if (playDealSound) playDealSound();
      }, i * stagger);
    });
    setTimeout(resolve, cardElements.length * stagger + 350);
  });
}

export function animateCardPlay(cardEl, fromPos, toPos, duration = 300) {
  return new Promise(resolve => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const rot = (Math.random() - 0.5) * 10;
    cardEl.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.8, 0.3, 1)`;
    cardEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
    setTimeout(() => {
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      resolve();
    }, duration);
  });
}

export function applyTableSurface(container) {
  injectCardStyles();
  container.classList.add('mgp-table-surface');
}

export function getSelectedCards(container) {
  return Array.from(container.querySelectorAll('.mgp-card-selected')).map(el => ({
    suit: el.dataset.suit,
    rank: el.dataset.rank,
    id: el.dataset.cardId,
  }));
}

export function clearSelection(container) {
  container.querySelectorAll('.mgp-card-selected').forEach(el => {
    el.classList.remove('mgp-card-selected');
    el.style.transform = '';
    el.style.boxShadow = '';
  });
}

export function sortHand(cards, bySuit = true) {
  const suitOrder = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
  return [...cards].sort((a, b) => {
    if (bySuit) {
      const sd = (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
      if (sd !== 0) return sd;
    }
    return cardValue(b) - cardValue(a);
  });
}

export function isSet(cards) {
  if (cards.length < 3) return false;
  return cards.every(c => c.rank === cards[0].rank);
}

export function isRun(cards) {
  if (cards.length < 3) return false;
  const sorted = [...cards].sort((a, b) => cardValue(a, false) - cardValue(b, false));
  if (!sorted.every(c => c.suit === sorted[0].suit)) return false;
  for (let i = 1; i < sorted.length; i++) {
    if (cardValue(sorted[i], false) - cardValue(sorted[i - 1], false) !== 1) return false;
  }
  return true;
}

export function deadwoodValue(cards) {
  return cards.reduce((sum, c) => {
    if (['K', 'Q', 'J'].includes(c.rank)) return sum + 10;
    if (c.rank === 'A') return sum + 1;
    return sum + parseInt(c.rank, 10);
  }, 0);
}

export { SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS };
