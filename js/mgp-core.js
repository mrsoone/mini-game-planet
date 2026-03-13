import MGPAudio from '/js/audio.js';
import MGPEffects from '/js/effects.js';
import { games } from '/data/games.js';
import { getPlayer, getLeaderboard, submitStats, setPlayerName } from '/js/player.js';
import { trackGameView, trackGameStart, trackGameOver } from '/js/analytics.js';
import { openConsentBanner } from '/js/consent.js';

const CATEGORY_THEMES = {
  Arcade: 'dark', Action: 'dark',
  Card: 'felt', Casino: 'felt',
  Board: 'wood', Strategy: 'wood',
  Puzzle: 'light', Word: 'light', Casual: 'light',
  Math: 'light', Trivia: 'light', Builder: 'light'
};

const CATEGORY_COLORS = {
  Arcade: '#0891B2', Puzzle: '#2563EB', Card: '#DC2626',
  Word: '#D97706', Strategy: '#0D9488', Casino: '#059669',
  Casual: '#E11D48', Action: '#EA580C', Board: '#4F46E5',
  Builder: '#0891B2', Math: '#0284C7', Trivia: '#6D28D9'
};

const state = {
  config: null,
  score: 0,
  time: 0,
  timerId: null,
  paused: false,
  gameOver: false,
  started: false,
  player: null,
  best: null,
  bestDisplay: null,
  keyHandler: null,
  elements: {
    pageContent: null,
    gameWrapper: null,
    gameArea: null,
    canvas: null,
    scoreValue: null,
    bestValue: null,
    timerValue: null,
    soundButton: null,
    pauseButton: null,
    gameOverOverlay: null,
    pauseOverlay: null,
    leaderboard: null,
    leaderboardHeader: null,
    leaderboardBody: null,
    playerBar: null,
    playerName: null
  }
};

function ensurePageShell() {
  let page = document.querySelector('.mgp-page');
  let content = document.querySelector('.mgp-page-content');
  if (page && content) return { page, content };

  page = document.createElement('div');
  page.className = 'mgp-page';
  content = document.createElement('div');
  content.className = 'mgp-page-content';
  page.appendChild(content);

  const nav = document.getElementById('nav-container');
  if (nav && nav.parentNode) {
    nav.insertAdjacentElement('afterend', page);
  } else {
    document.body.appendChild(page);
  }

  return { page, content };
}

function cleanup() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.keyHandler) {
    document.removeEventListener('keydown', state.keyHandler);
    state.keyHandler = null;
  }
  MGPEffects.destroy();
  state.paused = false;
  state.gameOver = false;
  state.started = false;
  state.elements.canvas = null;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getTheme(category) {
  return CATEGORY_THEMES[category] || 'light';
}

function getAccent(category) {
  return CATEGORY_COLORS[category] || '#2563EB';
}

function getBestKey(slug) {
  return `mgp-best-${slug}`;
}

function loadBest() {
  try {
    const raw = localStorage.getItem(getBestKey(state.config.slug));
    return raw == null ? null : Number(raw);
  } catch {
    return null;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(getBestKey(state.config.slug), String(value));
  } catch {}
}

function isBetterScore(candidate, current) {
  if (candidate == null) return false;
  if (current == null) return true;
  if (state.config.scoreMode === 'low' || state.config.scoreMode === 'time') return candidate < current;
  return candidate > current;
}

function ensureStarted() {
  if (state.started) return;
  state.started = true;
  trackGameStart(state.config.slug, state.config.category);
}

function makeButton(label, className, onClick, icon = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `mgp-btn ${className}`;
  button.textContent = icon ? `${icon} ${label}` : label;
  button.addEventListener('click', onClick);
  return button;
}

function buildFooter() {
  const footer = document.createElement('div');
  footer.className = 'mgp-footer';

  const links = [
    ['/about', 'About'],
    ['/privacy', 'Privacy'],
    ['/terms', 'Terms'],
    ['/cookies', 'Cookies'],
    ['/licenses', 'Licenses']
  ];

  const wrapper = document.createElement('div');
  wrapper.textContent = '© Mini Game Planet';
  links.forEach(([href, label]) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    wrapper.appendChild(link);
  });

  const cookieBtn = document.createElement('button');
  cookieBtn.type = 'button';
  cookieBtn.textContent = 'Cookie Settings';
  cookieBtn.style.background = 'none';
  cookieBtn.style.border = 'none';
  cookieBtn.style.padding = '0';
  cookieBtn.style.marginLeft = '8px';
  cookieBtn.style.cursor = 'pointer';
  cookieBtn.style.textDecoration = 'underline';
  cookieBtn.style.font = 'inherit';
  cookieBtn.style.color = 'inherit';
  cookieBtn.addEventListener('click', () => openConsentBanner());
  wrapper.appendChild(cookieBtn);

  footer.appendChild(wrapper);
  return footer;
}

function buildLeaderboard() {
  const panel = document.createElement('section');
  panel.className = 'mgp-leaderboard';

  const header = document.createElement('div');
  header.className = 'mgp-leaderboard-header';
  header.innerHTML = '<span>🏆 Leaderboard</span><span class="mgp-chevron">▾</span>';

  const body = document.createElement('div');
  body.className = 'mgp-leaderboard-body';
  body.innerHTML = '<div class="mgp-leaderboard-row"><div class="mgp-leaderboard-name">Loading leaderboard...</div></div>';

  header.addEventListener('click', () => {
    header.classList.toggle('collapsed');
    body.classList.toggle('collapsed');
  });

  panel.appendChild(header);
  panel.appendChild(body);

  state.elements.leaderboard = panel;
  state.elements.leaderboardHeader = header;
  state.elements.leaderboardBody = body;

  return panel;
}

function renderLeaderboardRows(data) {
  if (!state.elements.leaderboardBody) return;
  if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
    state.elements.leaderboardBody.innerHTML = '<div class="mgp-leaderboard-row"><div class="mgp-leaderboard-name">No scores yet. Be the first!</div></div>';
    return;
  }

  state.elements.leaderboardBody.innerHTML = '';
  data.entries.forEach((entry, index) => {
    const row = document.createElement('div');
    row.className = 'mgp-leaderboard-row';

    const rank = document.createElement('div');
    rank.className = 'mgp-leaderboard-rank';
    rank.textContent = entry.rank || index + 1;
    if (index === 0) rank.classList.add('gold');
    else if (index === 1) rank.classList.add('silver');
    else if (index === 2) rank.classList.add('bronze');

    const name = document.createElement('div');
    name.className = 'mgp-leaderboard-name';
    name.textContent = entry.name;
    if (state.player && entry.name === state.player.name) name.classList.add('is-you');

    const score = document.createElement('div');
    score.className = 'mgp-leaderboard-score';
    score.textContent = entry.score;

    row.append(rank, name, score);
    state.elements.leaderboardBody.appendChild(row);
  });
}

function buildRelatedGames() {
  const section = document.createElement('section');
  section.className = 'mgp-related-games';

  const heading = document.createElement('h3');
  heading.textContent = 'More Games You’ll Love';
  section.appendChild(heading);

  const grid = document.createElement('div');
  grid.className = 'mgp-related-grid';

  games
    .filter((game) => game.category === state.config.category && game.slug !== state.config.slug)
    .slice(0, 6)
    .forEach((game) => {
      const card = document.createElement('a');
      card.className = 'mgp-related-card';
      card.href = `/games/${game.slug}.html`;

      const color = document.createElement('div');
      color.className = 'mgp-related-card-color';
      color.style.background = game.accent || getAccent(game.category);
      color.textContent = game.icon || '🎮';

      const info = document.createElement('div');
      info.className = 'mgp-related-card-info';

      const title = document.createElement('div');
      title.className = 'mgp-related-card-title';
      title.textContent = game.name;

      info.appendChild(title);
      card.append(color, info);
      grid.appendChild(card);
    });

  section.appendChild(grid);
  return section;
}

function updateScoreDisplay(pop = false) {
  if (!state.elements.scoreValue) return;
  state.elements.scoreValue.textContent = state.score;
  if (pop) {
    state.elements.scoreValue.classList.remove('mgp-score-pop');
    void state.elements.scoreValue.offsetWidth;
    state.elements.scoreValue.classList.add('mgp-score-pop');
  }
}

function updateBestDisplay() {
  if (!state.elements.bestValue) return;
  state.elements.bestValue.textContent = state.best == null ? '—' : state.best;
}

function updateTimerDisplay() {
  if (!state.elements.timerValue) return;
  state.elements.timerValue.textContent = formatTime(state.time);
}

function setSoundButtonLabel() {
  if (!state.elements.soundButton) return;
  state.elements.soundButton.textContent = MGPAudio.isEnabled() ? '🔊 Sound' : '🔇 Sound';
}

function setPauseButtonLabel() {
  if (!state.elements.pauseButton) return;
  state.elements.pauseButton.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
}

async function refreshPlayer() {
  state.player = await getPlayer();
  if (state.elements.playerName) {
    state.elements.playerName.textContent = state.player?.name || 'Guest';
  }
  return state.player;
}

async function editPlayerName() {
  const current = state.player?.name || '';
  const next = window.prompt('Enter a display name (3-20 characters):', current);
  if (!next || next.trim() === current) return;
  const result = await setPlayerName(next.trim());
  if (result?.error) {
    window.alert(result.error);
    return;
  }
  await refreshPlayer();
  await MGP.loadLeaderboard();
}

function invokeRestart() {
  state.gameOver = false;
  state.paused = false;
  state.elements.gameOverOverlay?.classList.remove('active');
  state.elements.pauseOverlay?.classList.remove('active');
  setPauseButtonLabel();
  ensureStarted();
  if (typeof state.config.onRestart === 'function') {
    state.config.onRestart();
  }
}

function buildLayout(content) {
  const wrapper = document.createElement('section');
  wrapper.className = `mgp-game-wrapper mgp-theme-${MGP.theme}`;

  const scoreBar = document.createElement('div');
  scoreBar.className = 'mgp-score-bar';

  const title = document.createElement('div');
  title.className = 'mgp-game-title';
  title.textContent = state.config.title;

  const scores = document.createElement('div');
  scores.className = 'mgp-scores';

  if (state.config.scoreMode !== 'none') {
    const scoreBlock = document.createElement('div');
    scoreBlock.innerHTML = '<div class="mgp-score-label">Score</div><div class="mgp-score-value">0</div>';
    state.elements.scoreValue = scoreBlock.querySelector('.mgp-score-value');
    scores.appendChild(scoreBlock);

    const bestBlock = document.createElement('div');
    bestBlock.innerHTML = '<div class="mgp-score-label">Best</div><div class="mgp-score-value">—</div>';
    state.elements.bestValue = bestBlock.querySelector('.mgp-score-value');
    scores.appendChild(bestBlock);
  }

  if (state.config.hasTimer) {
    const timerBlock = document.createElement('div');
    timerBlock.innerHTML = '<div class="mgp-score-label">Time</div><div class="mgp-score-value">0:00</div>';
    state.elements.timerValue = timerBlock.querySelector('.mgp-score-value');
    scores.appendChild(timerBlock);
  }

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.flexWrap = 'wrap';

  const soundButton = makeButton('Sound', 'mgp-btn-secondary', () => {
    MGPAudio.toggle(!MGPAudio.isEnabled());
    setSoundButtonLabel();
  }, '🔊');
  soundButton.style.padding = '6px 12px';
  state.elements.soundButton = soundButton;
  setSoundButtonLabel();
  actions.appendChild(soundButton);

  if (state.config.canPause) {
    const pauseButton = makeButton('Pause', 'mgp-btn-secondary', () => {
      if (state.paused) MGP.resume(); else MGP.pause();
    }, '⏸');
    pauseButton.style.padding = '6px 12px';
    state.elements.pauseButton = pauseButton;
    setPauseButtonLabel();
    actions.appendChild(pauseButton);
  }

  scoreBar.append(title, scores, actions);

  const gameArea = document.createElement('div');
  gameArea.className = 'mgp-game-area';

  const controlsBar = document.createElement('div');
  controlsBar.className = 'mgp-controls-bar';
  const restartButton = makeButton('Restart', 'mgp-btn-primary', invokeRestart, '↻');
  restartButton.style.backgroundColor = MGP.accentColor;
  controlsBar.appendChild(restartButton);

  (state.config.customControls || []).forEach((control) => {
    const button = makeButton(control.label, 'mgp-btn-secondary', () => control.onClick?.(), control.icon || '');
    controlsBar.appendChild(button);
  });

  const playerBar = document.createElement('div');
  playerBar.className = 'mgp-player-bar';
  playerBar.innerHTML = '<span>Playing as <span class="mgp-player-name">Loading...</span></span><span class="mgp-player-edit">✏️</span>';
  state.elements.playerBar = playerBar;
  state.elements.playerName = playerBar.querySelector('.mgp-player-name');
  playerBar.querySelector('.mgp-player-edit').addEventListener('click', editPlayerName);

  const gameOverOverlay = document.createElement('div');
  gameOverOverlay.className = 'mgp-game-over-overlay';
  gameOverOverlay.innerHTML = `
    <div class="mgp-game-over-card">
      <div class="mgp-game-over-title">Game Over</div>
      <div class="mgp-game-over-subtitle">Nice run.</div>
      <div class="mgp-game-over-score">0</div>
      <div class="mgp-game-over-best">Best: —</div>
      <div class="mgp-game-over-actions"></div>
    </div>`;
  const playAgainButton = makeButton('Play Again', 'mgp-btn-primary', invokeRestart, '▶');
  playAgainButton.style.backgroundColor = MGP.accentColor;
  gameOverOverlay.querySelector('.mgp-game-over-actions').appendChild(playAgainButton);

  const pauseOverlay = document.createElement('div');
  pauseOverlay.className = 'mgp-pause-overlay';
  pauseOverlay.innerHTML = '<div class="mgp-pause-text">Paused</div>';

  wrapper.append(scoreBar, gameArea, controlsBar, playerBar, gameOverOverlay, pauseOverlay);

  state.elements.gameWrapper = wrapper;
  state.elements.gameArea = gameArea;
  state.elements.gameOverOverlay = gameOverOverlay;
  state.elements.pauseOverlay = pauseOverlay;

  content.appendChild(wrapper);
  content.appendChild(buildLeaderboard());
  content.appendChild(buildRelatedGames());

  const seoSource = document.getElementById('mgp-seo-source');
  if (seoSource && seoSource.innerHTML.trim()) {
    const seo = document.createElement('section');
    seo.className = 'mgp-seo-content';
    seo.innerHTML = seoSource.innerHTML;
    content.appendChild(seo);
  }

  content.appendChild(buildFooter());
}

function bindKeys() {
  state.keyHandler = (event) => {
    if (event.key === 'Escape' && state.config.canPause && !state.gameOver) {
      event.preventDefault();
      if (state.paused) MGP.resume(); else MGP.pause();
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && state.gameOver) {
      event.preventDefault();
      invokeRestart();
    }
  };

  document.addEventListener('keydown', state.keyHandler);
}

const MGP = {
  accentColor: '#2563EB',
  theme: 'light',
  elements: state.elements,
  sound: MGPAudio,

  init(config) {
    cleanup();

    state.config = {
      scoreMode: 'high',
      hasTimer: false,
      timerMode: 'up',
      timerStart: 0,
      canPause: true,
      onRestart: null,
      onPause: null,
      onResume: null,
      customControls: null,
      ...config
    };

    state.score = 0;
    state.time = Number(state.config.timerStart || 0);
    state.best = loadBest();

    MGP.theme = getTheme(state.config.category);
    MGP.accentColor = getAccent(state.config.category);

    const shell = ensurePageShell();
    state.elements.pageContent = shell.content;
    shell.content.innerHTML = '';

    buildLayout(shell.content);
    updateScoreDisplay();
    updateBestDisplay();
    updateTimerDisplay();
    bindKeys();

    MGPEffects.init(state.elements.gameWrapper);
    refreshPlayer();
    MGP.loadLeaderboard();
    trackGameView(state.config.slug, state.config.category);

    return MGP;
  },

  setScore(value) {
    ensureStarted();
    state.score = Number(value) || 0;
    updateScoreDisplay();
  },

  addScore(value) {
    ensureStarted();
    state.score += Number(value) || 0;
    updateScoreDisplay(true);
  },

  getScore() {
    return state.score;
  },

  startTimer() {
    ensureStarted();
    if (!state.config.hasTimer || state.timerId) return;
    state.timerId = window.setInterval(() => {
      if (state.paused || state.gameOver) return;
      if (state.config.timerMode === 'down') {
        state.time = Math.max(0, state.time - 1);
        if (state.time === 0) MGP.stopTimer();
      } else {
        state.time += 1;
      }
      updateTimerDisplay();
    }, 1000);
  },

  stopTimer() {
    if (!state.timerId) return;
    clearInterval(state.timerId);
    state.timerId = null;
  },

  getTime() {
    return state.time;
  },

  setTime(value) {
    state.time = Math.max(0, Number(value) || 0);
    updateTimerDisplay();
  },

  async gameOver(options = {}) {
    MGP.stopTimer();
    state.gameOver = true;
    state.paused = false;
    setPauseButtonLabel();

    const finalScore = options.score ?? state.score;
    const isNewBest = isBetterScore(finalScore, state.best);
    if (isNewBest) {
      state.best = finalScore;
      saveBest(finalScore);
      updateBestDisplay();
    }

    const overlay = state.elements.gameOverOverlay;
    overlay.querySelector('.mgp-game-over-title').textContent = options.title || 'Game Over';
    overlay.querySelector('.mgp-game-over-subtitle').textContent = options.subtitle || 'Nice run.';
    overlay.querySelector('.mgp-game-over-score').textContent = finalScore;
    overlay.querySelector('.mgp-game-over-best').textContent = `Best: ${state.best == null ? '—' : state.best}`;

    const card = overlay.querySelector('.mgp-game-over-card');
    const existingTag = card.querySelector('.mgp-new-best');
    if (existingTag) existingTag.remove();
    if (isNewBest) {
      const tag = document.createElement('div');
      tag.className = 'mgp-new-best';
      tag.style.backgroundColor = MGP.accentColor;
      tag.textContent = 'NEW BEST';
      overlay.querySelector('.mgp-game-over-best').insertAdjacentElement('afterend', tag);
    }

    overlay.classList.add('active');
    MGPAudio.win();
    trackGameOver(state.config.slug, state.config.category, finalScore, state.time);
    setTimeout(() => MGP.loadLeaderboard(), 400);
  },

  pause() {
    if (!state.config.canPause || state.gameOver) return;
    state.paused = true;
    state.elements.pauseOverlay?.classList.add('active');
    setPauseButtonLabel();
    state.config.onPause?.();
  },

  resume() {
    state.paused = false;
    state.elements.pauseOverlay?.classList.remove('active');
    setPauseButtonLabel();
    state.config.onResume?.();
  },

  isPaused() {
    return state.paused;
  },

  burst(x, y, color, count) {
    MGPEffects.burst(x, y, color || MGP.accentColor, count);
  },

  confetti(x, y) {
    MGPEffects.confetti(x, y, [MGP.accentColor, '#FFFFFF', '#F59E0B']);
  },

  shake(intensity) {
    MGPEffects.shake(intensity);
  },

  scorePopup(x, y, text, color) {
    MGPEffects.scorePopup(x, y, text, color || MGP.accentColor);
  },

  getPlayer() {
    return state.player;
  },

  getPlayerName() {
    return state.player?.name || 'Guest';
  },

  async submitScore(score) {
    const value = Number(score ?? state.score) || 0;
    const payload = { duration: state.time, win: true };
    if (state.config.scoreMode === 'time') payload.best_time = value;
    else payload.score = value;
    return submitStats(state.config.slug, payload);
  },

  async loadLeaderboard() {
    const data = await getLeaderboard(state.config.slug);
    renderLeaderboardRows(data);
    return data;
  }
};

if (typeof window !== 'undefined') {
  window.MGP = MGP;
}

export default MGP;
