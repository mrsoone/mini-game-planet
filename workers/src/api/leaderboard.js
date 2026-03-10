import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';
import { getScoreType } from '../utils/validation.js';

export async function handleGetLeaderboard(request, env, gameSlug) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');
  const scoreType = getScoreType(gameSlug);
  const orderDir = scoreType === 'best_time' ? 'ASC' : 'DESC';

  try {
    const { results } = await env.DB.prepare(`
      SELECT player_name, score_value, ip_hash
      FROM leaderboard
      WHERE game_slug = ? AND score_type = ?
      ORDER BY score_value ${orderDir}
      LIMIT 20
    `).bind(gameSlug, scoreType).all();

    const entries = results.map((r, i) => ({
      rank: i + 1,
      name: r.player_name,
      score: r.score_value,
      isYou: r.ip_hash === ipHash,
    }));

    let yourRank = entries.findIndex(e => e.isYou) + 1;
    if (!yourRank) {
      const countQuery = scoreType === 'best_time'
        ? `SELECT COUNT(*) as cnt FROM leaderboard WHERE game_slug = ? AND score_type = ? AND score_value <= (SELECT score_value FROM leaderboard WHERE game_slug = ? AND score_type = ? AND ip_hash = ?)`
        : `SELECT COUNT(*) as cnt FROM leaderboard WHERE game_slug = ? AND score_type = ? AND score_value >= (SELECT score_value FROM leaderboard WHERE game_slug = ? AND score_type = ? AND ip_hash = ?)`;
      try {
        const { results: rankResults } = await env.DB.prepare(countQuery)
          .bind(gameSlug, scoreType, gameSlug, scoreType, ipHash).all();
        yourRank = rankResults[0]?.cnt || 0;
      } catch { yourRank = 0; }
    }

    const { results: totalResults } = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM leaderboard WHERE game_slug = ? AND score_type = ?'
    ).bind(gameSlug, scoreType).all();

    return jsonResponse({
      game: gameSlug,
      scoreType,
      entries: entries.map(({ isYou, ...e }) => e),
      yourRank,
      totalPlayers: totalResults[0]?.total || 0,
    }, 200, origin);
  } catch (e) {
    return jsonResponse({ entries: [], yourRank: 0, totalPlayers: 0 }, 200, origin);
  }
}

export async function handleGetGlobalLeaderboard(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');

  try {
    const { results } = await env.DB.prepare(`
      SELECT player_name, total_played, total_wins, favorite_game, ip_hash
      FROM global_stats
      ORDER BY total_played DESC
      LIMIT 10
    `).all();

    const entries = results.map((r, i) => ({
      rank: i + 1,
      name: r.player_name,
      totalPlayed: r.total_played,
      totalWins: r.total_wins,
      favoriteGame: r.favorite_game,
      isYou: r.ip_hash === ipHash,
    }));

    return jsonResponse({
      entries: entries.map(({ isYou, ...e }) => e),
    }, 200, origin);
  } catch (e) {
    return jsonResponse({ entries: [] }, 200, origin);
  }
}
