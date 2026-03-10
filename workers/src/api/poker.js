import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';

const STARTING_CHIPS = 10000;
const TOPUP_AMOUNT = 5000;
const TOPUP_THRESHOLD = 1000;
const TOPUP_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getProfile(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  let profile = await env.PLAYERS.get(`player:${ipHash}`, 'json');
  return { ipHash, profile };
}

function ensurePoker(profile) {
  if (!profile.poker) {
    profile.poker = {
      chipBalance: STARTING_CHIPS,
      lastTopUp: null,
      stats: {
        handsPlayed: 0,
        handsWon: 0,
        biggestPot: 0,
        biggestWin: 0,
        totalWinnings: 0,
        totalLosses: 0,
        allInsWon: 0,
        allInsLost: 0
      }
    };
  }
  return profile;
}

export async function handlePokerBalance(request, env) {
  const origin = request.headers.get('Origin');
  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  const now = Date.now();
  const lastTopUp = profile.poker.lastTopUp ? new Date(profile.poker.lastTopUp).getTime() : 0;
  const elapsed = now - lastTopUp;
  const topUpEligible = profile.poker.chipBalance < TOPUP_THRESHOLD && elapsed >= TOPUP_COOLDOWN_MS;
  const msUntilTopUp = topUpEligible ? 0 : Math.max(0, TOPUP_COOLDOWN_MS - elapsed);

  return jsonResponse({
    balance: profile.poker.chipBalance,
    topUpEligible,
    topUpAvailableAt: msUntilTopUp > 0 ? new Date(now + msUntilTopUp).toISOString() : null,
    hoursUntilTopUp: Math.ceil(msUntilTopUp / 3600000)
  }, 200, origin);
}

export async function handlePokerTopup(request, env) {
  const origin = request.headers.get('Origin');
  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);

  if (profile.poker.chipBalance >= TOPUP_THRESHOLD) {
    return jsonResponse({ error: 'Balance too high for top-up. Must be below 1,000.' }, 400, origin);
  }

  const now = Date.now();
  const lastTopUp = profile.poker.lastTopUp ? new Date(profile.poker.lastTopUp).getTime() : 0;
  if (now - lastTopUp < TOPUP_COOLDOWN_MS) {
    const hoursLeft = Math.ceil((TOPUP_COOLDOWN_MS - (now - lastTopUp)) / 3600000);
    return jsonResponse({ error: `Top-up available in ${hoursLeft} hours.` }, 429, origin);
  }

  profile.poker.chipBalance += TOPUP_AMOUNT;
  profile.poker.lastTopUp = new Date().toISOString();
  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  return jsonResponse({
    newBalance: profile.poker.chipBalance,
    nextTopUpAt: new Date(now + TOPUP_COOLDOWN_MS).toISOString()
  }, 200, origin);
}

export async function handlePokerBuyin(request, env) {
  const origin = request.headers.get('Origin');
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const amount = parseInt(body.amount);
  if (!amount || amount <= 0) return jsonResponse({ error: 'Invalid amount' }, 400, origin);

  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);

  if (profile.poker.chipBalance < amount) {
    return jsonResponse({ error: 'Insufficient bankroll' }, 400, origin);
  }

  profile.poker.chipBalance -= amount;
  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  return jsonResponse({
    bought: amount,
    remainingBalance: profile.poker.chipBalance
  }, 200, origin);
}

export async function handlePokerCashout(request, env) {
  const origin = request.headers.get('Origin');
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const amount = parseInt(body.amount);
  if (!amount || amount <= 0) return jsonResponse({ error: 'Invalid amount' }, 400, origin);

  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);

  profile.poker.chipBalance += amount;
  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  return jsonResponse({
    cashedOut: amount,
    newBalance: profile.poker.chipBalance
  }, 200, origin);
}

export async function handlePokerStats(request, env) {
  const origin = request.headers.get('Origin');
  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);

  return jsonResponse({
    name: profile.name,
    balance: profile.poker.chipBalance,
    stats: profile.poker.stats
  }, 200, origin);
}

export async function handlePokerStatsUpdate(request, env) {
  const origin = request.headers.get('Origin');
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const { ipHash, profile } = await getProfile(request, env);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  ensurePoker(profile);
  const s = profile.poker.stats;

  if (body.handsPlayed) s.handsPlayed += body.handsPlayed;
  if (body.handsWon) s.handsWon += body.handsWon;
  if (body.biggestPot && body.biggestPot > s.biggestPot) s.biggestPot = body.biggestPot;
  if (body.biggestWin && body.biggestWin > s.biggestWin) s.biggestWin = body.biggestWin;
  if (body.winnings) s.totalWinnings += body.winnings;
  if (body.losses) s.totalLosses += body.losses;
  if (body.allInWon) s.allInsWon += body.allInWon;
  if (body.allInLost) s.allInsLost += body.allInLost;

  if (body.chipBalance !== undefined) profile.poker.chipBalance = body.chipBalance;

  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  try {
    await env.DB.prepare(
      `INSERT INTO leaderboard (ip_hash, player_name, game_slug, score_type, score, updated_at)
       VALUES (?, ?, 'texas-holdem', 'bankroll', ?, ?)
       ON CONFLICT (ip_hash, game_slug, score_type)
       DO UPDATE SET score = excluded.score, player_name = excluded.player_name, updated_at = excluded.updated_at`
    ).bind(ipHash, profile.name, profile.poker.chipBalance, new Date().toISOString()).run();
  } catch (e) { /* D1 may not be ready */ }

  return jsonResponse({ ok: true, stats: s, balance: profile.poker.chipBalance }, 200, origin);
}

export async function handlePokerLeaderboard(request, env) {
  const origin = request.headers.get('Origin');

  try {
    const result = await env.DB.prepare(
      `SELECT player_name, score FROM leaderboard
       WHERE game_slug = 'texas-holdem' AND score_type = 'bankroll'
       ORDER BY score DESC LIMIT 20`
    ).all();

    return jsonResponse({
      entries: (result.results || []).map((r, i) => ({
        rank: i + 1,
        name: r.player_name,
        balance: r.score
      }))
    }, 200, origin);
  } catch (e) {
    return jsonResponse({ entries: [] }, 200, origin);
  }
}
