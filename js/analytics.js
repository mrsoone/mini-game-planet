// MiniGamePlanet — Custom GA4 Event Tracking (Consent-Gated)
// Every event checks consent state before firing.

import { hasAnalyticsConsent } from '/js/consent.js';

function fire(eventName, params = {}) {
  if (!hasAnalyticsConsent()) return;
  if (typeof gtag !== 'function') return;
  gtag('event', eventName, params);
}

export function trackGameView(slug, category) {
  fire('game_view', { game_slug: slug, game_category: category });
}

export function trackGameStart(slug, category) {
  fire('game_start', { game_slug: slug, game_category: category });
}

const GAME_TYPES = {
  'chess':'win_loss','checkers':'win_loss','tic-tac-toe':'win_loss','disc-drop':'win_loss',
  'reversi':'win_loss','naval-strike':'win_loss','dots-and-boxes':'win_loss','four-in-a-row':'win_loss',
  'mancala':'win_loss','nim':'win_loss','backgammon':'win_loss','dominoes':'win_loss',
  'chinese-checkers':'win_loss','ludo':'win_loss','snakes-and-ladders':'win_loss',
  'blackjack':'win_loss','solitaire':'win_loss','spider-solitaire':'win_loss','freecell':'win_loss',
  'video-poker':'win_loss','war':'win_loss','go-fish':'win_loss','crazy-eights':'win_loss',
  'baccarat':'win_loss','rock-paper-scissors':'win_loss','word-guess':'win_loss','hangman':'win_loss',
  'paddle-ball':'win_loss',
  'dice-frenzy':'high_score','snake':'high_score','breakout':'high_score','space-rocks':'high_score',
  'star-defenders':'high_score','sky-bounce':'high_score','fruit-slicer':'high_score',
  'endless-runner':'high_score','critter-bonk':'high_score','helicopter-game':'high_score',
  'duck-hunt':'high_score','dodge-ball':'high_score','twenty-forty-eight':'high_score',
  'high-low':'high_score','color-flood':'high_score','box-pusher':'high_score','block-puzzle':'high_score',
  'match-three':'high_score','anagram-scramble':'high_score','typing-race':'high_score',
  'spelling-bee':'high_score','slot-machine':'high_score','roulette':'high_score',
  'dice-roller':'high_score','coin-flip':'high_score','spin-the-wheel':'high_score',
  'scratch-card':'high_score','keno':'high_score','clicker':'high_score','aim-trainer':'high_score',
  'color-match':'high_score','color-recall':'high_score','trivia-quiz':'high_score',
  'number-memory':'high_score','sequence-memory':'high_score','spot-the-difference':'high_score',
  'card-dodger':'high_score','jumping-rabbit':'high_score','tower-stack':'high_score',
  'rhythm-tap':'high_score','color-gate':'high_score','knife-throw':'high_score',
  'ball-bounce':'high_score','gravity-flip':'high_score','math-sprint':'high_score',
  'binary-game':'high_score','flag-quiz':'high_score','capital-quiz':'high_score',
  'geography-quiz':'high_score','history-timeline':'high_score','periodic-table-quiz':'high_score',
  'memory-match':'best_time','minesweeper':'best_time','sudoku':'best_time','nonogram':'best_time',
  'sliding-puzzle':'best_time','tower-of-hanoi':'best_time','grid-glow':'best_time',
  'pipe-connect':'best_time','jigsaw':'best_time','maze-escape':'best_time',
  'word-search':'best_time','crossword-mini':'best_time','word-chain':'best_time',
  'reaction-time':'best_time','number-puzzle':'best_time','equation-builder':'best_time',
  'logic-grid':'best_time',
  'spades':'win_loss','hearts':'win_loss','gin-rummy':'win_loss','rummy-500':'win_loss',
  'euchre':'win_loss','cribbage':'win_loss','oh-hell':'win_loss','pitch':'win_loss',
  'presidents':'win_loss','egyptian-rat-screw':'win_loss','word-bomb':'win_loss',
  'pictionary-draw':'high_score','trivia-battle':'high_score','tank-battle':'high_score',
  'battle-snake':'high_score',
};

let _lastAutoSubmit = 0;

async function _autoSubmitStats(slug, category, score, durationSeconds) {
  try {
    const now = Date.now();
    if (now - _lastAutoSubmit < 4000) return;
    _lastAutoSubmit = now;

    const gameSlug = slug || window._mgpGameSlug;
    if (!gameSlug) return;

    const type = GAME_TYPES[gameSlug];
    if (!type) return;

    const elapsed = (typeof durationSeconds === 'number' && durationSeconds > 0)
      ? Math.round(durationSeconds)
      : (window._mgpGameStart ? Math.round((now - window._mgpGameStart) / 1000) : undefined);

    let actualScore = score;
    if (actualScore === undefined && category !== undefined) {
      if (typeof category === 'number' || typeof category === 'boolean'
          || category === 'win' || category === 'loss' || category === 'draw') {
        actualScore = category;
      }
    }

    const data = {};
    if (elapsed !== undefined) data.duration = elapsed;

    if (type === 'high_score') {
      data.score = typeof actualScore === 'number' ? actualScore : 0;
    } else if (type === 'win_loss') {
      const s = actualScore;
      let isWin = s === 1 || s === true || s === 'win' || s === 'Win'
        || (typeof s === 'number' && s > 0);
      let isLoss = s === 0 || s === false || s === 'loss' || s === 'Loss';
      let isDraw = s === 'draw' || s === 'Draw';
      if (s && typeof s === 'object') {
        if (s.result === 'win' || s.won === true) isWin = true;
        else if (s.result === 'loss' || s.won === false) isLoss = true;
        else if (s.result === 'draw') isDraw = true;
      }
      if (isWin) data.win = true;
      else if (isLoss) data.loss = true;
      else if (isDraw) data.draw = true;
      else data.win = true;
    } else if (type === 'best_time') {
      const t = elapsed || (typeof actualScore === 'number' ? actualScore : 0);
      if (t > 0) {
        data.best_time = t;
        data.win = true;
      } else {
        return;
      }
    }

    const { submitStats } = await import('/js/player.js');
    await submitStats(gameSlug, data);
  } catch (e) { /* silent */ }
}

export function trackGameOver(slug, category, score, durationSeconds) {
  fire('game_over', {
    game_slug: slug,
    game_category: category,
    score: score,
    duration_seconds: durationSeconds
  });
  _autoSubmitStats(slug, category, score, durationSeconds);
}

export function trackSearch(searchTerm, resultCount) {
  fire('search', { search_term: searchTerm, result_count: resultCount });
}

export function trackCategoryFilter(category) {
  fire('category_filter', { category: category });
}
