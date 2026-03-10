import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';
import { validateSubmission, getScoreType } from '../utils/validation.js';

const RATE_LIMIT_MS = 3000;
const rateLimitMap = new Map();

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

  const { game_slug, score, duration, win, loss, draw, best_time } = body;
  if (!game_slug) return jsonResponse({ error: 'game_slug required' }, 400, origin);

  const validation = validateSubmission(game_slug, { score, duration });
  if (!validation.valid) return jsonResponse({ error: validation.reason }, 400, origin);

  let profile = await env.PLAYERS.get(`player:${ipHash}`, 'json');
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  if (!profile.stats[game_slug]) {
    profile.stats[game_slug] = {
      played: 0, wins: 0, losses: 0, draws: 0,
      highScore: null, bestTime: null,
      bestStreak: 0, currentStreak: 0,
      totalTimePlayed: 0,
    };
  }
  const gs = profile.stats[game_slug];
  gs.played += 1;
  if (duration) gs.totalTimePlayed += Math.round(duration);
  if (win) { gs.wins += 1; gs.currentStreak += 1; }
  else if (loss) { gs.losses += 1; gs.currentStreak = 0; }
  else if (draw) { gs.draws += 1; }
  if (gs.currentStreak > gs.bestStreak) gs.bestStreak = gs.currentStreak;
  if (score !== undefined && score !== null && (gs.highScore === null || score > gs.highScore)) {
    gs.highScore = score;
  }
  if (best_time !== undefined && best_time !== null && (gs.bestTime === null || best_time < gs.bestTime)) {
    gs.bestTime = best_time;
  }

  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

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

  return jsonResponse({ ok: true, stats: gs }, 200, origin);
}
