/**
 * Stats API — game result submission with Elo, online/AI tracking, per-game Elo.
 */
import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';
import { validateSubmission, getScoreType } from '../utils/validation.js';

const RATE_LIMIT_MS = 3000;
const rateLimitMap = new Map();

const K_FACTOR = 32;
const RANKED_GAMES = [
  'chess', 'checkers', 'disc-drop', 'reversi', 'spades', 'hearts',
  'backgammon', 'gin-rummy', 'euchre', 'cribbage',
];

function calcElo(ratingA, ratingB, scoreA) {
  const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + K_FACTOR * (scoreA - expected));
}

export async function handleSubmitStats(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');
  const now = Date.now();

  const lastSubmit = rateLimitMap.get(ipHash) || 0;
  if (now - lastSubmit < RATE_LIMIT_MS) {
    return jsonResponse({ error: 'Rate limited. Wait 3 seconds.' }, 429, origin);
  }
  rateLimitMap.set(ipHash, now);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const { game_slug, score, duration, win, loss, draw, best_time, online = false, opponent_elo } = body;
  if (!game_slug) return jsonResponse({ error: 'game_slug required' }, 400, origin);

  const validation = validateSubmission(game_slug, { score, duration });
  if (!validation.valid) return jsonResponse({ error: validation.reason }, 400, origin);

  let profile = await env.PLAYERS.get(`player:${ipHash}`, 'json');
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  // Ensure elo map exists
  if (!profile.elo) profile.elo = {};

  if (!profile.stats[game_slug]) {
    profile.stats[game_slug] = {
      played: 0, wins: 0, losses: 0, draws: 0,
      highScore: null, bestTime: null,
      bestStreak: 0, currentStreak: 0,
      totalTimePlayed: 0,
      onlineWins: 0, onlineLosses: 0,
      aiWins: 0, aiLosses: 0,
    };
  }
  const gs = profile.stats[game_slug];

  // Backfill new fields for legacy stats
  if (gs.onlineWins === undefined) gs.onlineWins = 0;
  if (gs.onlineLosses === undefined) gs.onlineLosses = 0;
  if (gs.aiWins === undefined) gs.aiWins = 0;
  if (gs.aiLosses === undefined) gs.aiLosses = 0;

  gs.played += 1;
  if (duration) gs.totalTimePlayed += Math.round(duration);

  if (win) {
    gs.wins += 1;
    gs.currentStreak += 1;
    if (online) gs.onlineWins += 1; else gs.aiWins += 1;
  } else if (loss) {
    gs.losses += 1;
    gs.currentStreak = 0;
    if (online) gs.onlineLosses += 1; else gs.aiLosses += 1;
  } else if (draw) {
    gs.draws += 1;
  }
  if (gs.currentStreak > gs.bestStreak) gs.bestStreak = gs.currentStreak;
  if (score !== undefined && score !== null && (gs.highScore === null || score > gs.highScore)) {
    gs.highScore = score;
  }
  if (best_time !== undefined && best_time !== null && (gs.bestTime === null || best_time < gs.bestTime)) {
    gs.bestTime = best_time;
  }

  // Per-game Elo update for ranked games
  let eloChange = null;
  if (RANKED_GAMES.includes(game_slug) && online && (win || loss)) {
    const currentElo = profile.elo[game_slug] || 1000;
    const oppElo = opponent_elo || 1000;
    const scoreVal = win ? 1 : 0;
    const newElo = calcElo(currentElo, oppElo, scoreVal);
    eloChange = { old: currentElo, new: newElo, delta: newElo - currentElo };
    profile.elo[game_slug] = newElo;
  }

  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  // Leaderboard upsert
  const scoreType = getScoreType(game_slug);
  let leaderboardValue = null;
  if (scoreType === 'high_score' && gs.highScore !== null) leaderboardValue = gs.highScore;
  else if (scoreType === 'best_time' && gs.bestTime !== null) leaderboardValue = gs.bestTime;
  else if (scoreType === 'win_loss') leaderboardValue = gs.wins;

  if (leaderboardValue !== null) {
    try {
      const now_iso = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO leaderboard (game_slug, score_type, ip_hash, player_name, score_value, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_slug, score_type, ip_hash) DO UPDATE SET
          score_value = CASE
            WHEN ? = 'best_time' THEN MIN(excluded.score_value, leaderboard.score_value)
            ELSE MAX(excluded.score_value, leaderboard.score_value)
          END,
          player_name = excluded.player_name,
          updated_at = excluded.updated_at
      `).bind(game_slug, scoreType, ipHash, profile.name, leaderboardValue, now_iso, scoreType).run();

      // Elo leaderboard entry for ranked games
      if (RANKED_GAMES.includes(game_slug) && profile.elo[game_slug]) {
        await env.DB.prepare(`
          INSERT INTO leaderboard (game_slug, score_type, ip_hash, player_name, score_value, updated_at)
          VALUES (?, 'elo', ?, ?, ?, ?)
          ON CONFLICT(game_slug, score_type, ip_hash) DO UPDATE SET
            score_value = excluded.score_value,
            player_name = excluded.player_name,
            updated_at = excluded.updated_at
        `).bind(game_slug, ipHash, profile.name, profile.elo[game_slug], now_iso).run();
      }

      // Online wins leaderboard
      if (online && gs.onlineWins > 0) {
        await env.DB.prepare(`
          INSERT INTO leaderboard (game_slug, score_type, ip_hash, player_name, score_value, updated_at)
          VALUES (?, 'online_wins', ?, ?, ?, ?)
          ON CONFLICT(game_slug, score_type, ip_hash) DO UPDATE SET
            score_value = MAX(excluded.score_value, leaderboard.score_value),
            player_name = excluded.player_name,
            updated_at = excluded.updated_at
        `).bind(game_slug, ipHash, profile.name, gs.onlineWins, now_iso).run();
      }

      // Global stats
      const totalPlayed = Object.values(profile.stats).reduce((s, g) => s + g.played, 0);
      const totalWins = Object.values(profile.stats).reduce((s, g) => s + g.wins, 0);
      const totalTime = Object.values(profile.stats).reduce((s, g) => s + g.totalTimePlayed, 0);
      const favorite = Object.entries(profile.stats).sort((a, b) => b[1].played - a[1].played)[0]?.[0] || null;

      await env.DB.prepare(`
        INSERT INTO global_stats (ip_hash, player_name, total_played, total_wins, total_time, favorite_game, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ip_hash) DO UPDATE SET
          player_name = excluded.player_name,
          total_played = excluded.total_played,
          total_wins = excluded.total_wins,
          total_time = excluded.total_time,
          favorite_game = excluded.favorite_game,
          updated_at = excluded.updated_at
      `).bind(ipHash, profile.name, totalPlayed, totalWins, totalTime, favorite, now_iso).run();
    } catch (e) { /* D1 may not be ready */ }
  }

  return jsonResponse({ ok: true, stats: gs, eloChange }, 200, origin);
}
