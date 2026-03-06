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

export function trackGameOver(slug, category, score, durationSeconds) {
  fire('game_over', {
    game_slug: slug,
    game_category: category,
    score: score,
    duration_seconds: durationSeconds
  });
}

export function trackSearch(searchTerm, resultCount) {
  fire('search', { search_term: searchTerm, result_count: resultCount });
}

export function trackCategoryFilter(category) {
  fire('category_filter', { category: category });
}
