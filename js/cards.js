/**
 * cards.js — Shared card rendering module for MiniGamePlanet
 * Used by all card games (Blackjack, Spades, Hearts, Gin Rummy, etc.)
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLORS = { hearts: '#DC2626', diamonds: '#DC2626', clubs: '#0F172A', spades: '#0F172A' };
const CARD_BACK_COLOR = '#DC2626';

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
  const el = document.createElement('div');
  el.className = 'mgp-card' + (faceUp ? '' : ' mgp-card-back');
  el.dataset.cardId = card.id || `${card.rank}-${card.suit}`;
  el.dataset.suit = card.suit;
  el.dataset.rank = card.rank;

  const w = 'clamp(56px, 9vw, 80px)';
  const h = 'clamp(80px, 13vw, 112px)';

  if (!faceUp) {
    el.style.cssText = `width:${w};height:${h};border-radius:8px;position:relative;cursor:pointer;flex-shrink:0;
      background:${CARD_BACK_COLOR};
      background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.08) 4px,rgba(255,255,255,0.08) 8px);
      box-shadow:0 2px 6px rgba(0,0,0,0.15);border:2px solid rgba(255,255,255,0.2);
      transition:transform 0.6s;transform-style:preserve-3d;`;
    return el;
  }

  const color = SUIT_COLORS[card.suit] || '#0F172A';
  const sym = SUIT_SYMBOLS[card.suit] || '';
  el.style.cssText = `width:${w};height:${h};border-radius:8px;background:#fff;position:relative;cursor:pointer;flex-shrink:0;
    box-shadow:0 2px 6px rgba(0,0,0,0.12);border:1.5px solid #E5E7EB;
    display:flex;flex-direction:column;justify-content:space-between;padding:4px 6px;
    font-family:'Space Grotesk',system-ui,sans-serif;color:${color};user-select:none;
    transition:transform 0.15s,box-shadow 0.15s;`;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:flex-start;line-height:1;">
      <span style="font-size:clamp(13px,2.2vw,18px);font-weight:700;">${card.rank}</span>
      <span style="font-size:clamp(11px,1.8vw,16px);margin-top:-2px;">${sym}</span>
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;">
      <span style="font-size:clamp(20px,3.5vw,32px);">${sym}</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;line-height:1;transform:rotate(180deg);">
      <span style="font-size:clamp(13px,2.2vw,18px);font-weight:700;">${card.rank}</span>
      <span style="font-size:clamp(11px,1.8vw,16px);margin-top:-2px;">${sym}</span>
    </div>`;

  el.addEventListener('mouseenter', () => {
    el.style.transform = 'translateY(-4px)';
    el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.18)';
  });
  el.addEventListener('mouseleave', () => {
    if (!el.classList.contains('mgp-card-selected')) {
      el.style.transform = '';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
    }
  });

  return el;
}

export function renderHand(cards, options = {}) {
  const { spread = -20, selectable = false, onSelect = null, maxWidth = null } = options;
  const container = document.createElement('div');
  container.className = 'mgp-hand';
  container.style.cssText = `display:flex;justify-content:center;align-items:flex-end;position:relative;min-height:120px;padding:8px 0;`;
  if (maxWidth) container.style.maxWidth = maxWidth;

  const effectiveSpread = cards.length > 10 ? Math.max(spread, -30) : spread;
  cards.forEach((card, i) => {
    const el = renderCard(card, true);
    const offset = effectiveSpread * (i - (cards.length - 1) / 2);
    el.style.marginLeft = i === 0 ? '0' : `${Math.max(effectiveSpread, -24)}px`;
    el.style.zIndex = i;

    if (selectable) {
      el.addEventListener('click', () => {
        const wasSelected = el.classList.contains('mgp-card-selected');
        if (wasSelected) {
          el.classList.remove('mgp-card-selected');
          el.style.transform = '';
          el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
        } else {
          el.classList.add('mgp-card-selected');
          el.style.transform = 'translateY(-12px)';
          el.style.boxShadow = `0 4px 12px rgba(220,38,38,0.3)`;
        }
        if (onSelect) onSelect(card, !wasSelected, el);
      });
    }

    container.appendChild(el);
  });

  return container;
}

export function renderPile(cards, options = {}) {
  const { showCount = true, label = '' } = options;
  const container = document.createElement('div');
  container.className = 'mgp-pile';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';

  if (cards.length > 0) {
    const topCard = renderCard(cards[cards.length - 1], false);
    container.appendChild(topCard);
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = `width:clamp(56px,9vw,80px);height:clamp(80px,13vw,112px);border-radius:8px;border:2px dashed #94A3B8;`;
    container.appendChild(empty);
  }

  if (showCount || label) {
    const info = document.createElement('div');
    info.style.cssText = 'font-size:11px;color:#64748B;font-family:"DM Mono",monospace;text-align:center;';
    info.textContent = label || `${cards.length} cards`;
    container.appendChild(info);
  }

  return container;
}

export function renderTrick(cardsPlayed, playerPositions = ['South', 'West', 'North', 'East']) {
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

    const label = document.createElement('span');
    label.style.cssText = 'font-size:10px;color:#94A3B8;font-family:"Space Grotesk",sans-serif;';
    label.textContent = pos;
    slot.appendChild(label);

    container.appendChild(slot);
  });

  return container;
}

export function animateCardPlay(cardEl, fromPos, toPos, duration = 300) {
  return new Promise(resolve => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    cardEl.style.transition = `transform ${duration}ms ease`;
    cardEl.style.transform = `translate(${dx}px, ${dy}px)`;
    setTimeout(() => {
      cardEl.style.transition = '';
      cardEl.style.transform = '';
      resolve();
    }, duration);
  });
}

export function animateCardDeal(cardElements, targets, stagger = 80) {
  return new Promise(resolve => {
    cardElements.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'scale(0.5) translateY(-40px)';
      setTimeout(() => {
        el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        el.style.opacity = '1';
        el.style.transform = '';
      }, i * stagger);
    });
    setTimeout(resolve, cardElements.length * stagger + 250);
  });
}

export function flipCard(cardEl) {
  return new Promise(resolve => {
    cardEl.style.transition = 'transform 0.3s ease';
    cardEl.style.transform = 'rotateY(90deg)';
    setTimeout(() => {
      cardEl.classList.toggle('mgp-card-back');
      cardEl.style.transform = 'rotateY(0deg)';
      setTimeout(resolve, 300);
    }, 300);
  });
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
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
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

export { SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS, CARD_BACK_COLOR };
