import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';
import { generateName, isNameClean } from '../utils/names.js';

export async function handleGetPlayer(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');

  let profile = await env.PLAYERS.get(`player:${ipHash}`, 'json');
  if (!profile) {
    profile = {
      ipHash,
      name: generateName(),
      nameChangeCount: 0,
      stats: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));
  }

  return jsonResponse({
    name: profile.name,
    nameChangeCount: profile.nameChangeCount,
    stats: profile.stats,
    createdAt: profile.createdAt,
  }, 200, origin);
}

export async function handleSetName(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const newName = (body.name || '').trim();
  if (!isNameClean(newName)) {
    return jsonResponse({ error: 'Invalid name. Use 3-20 alphanumeric characters.' }, 400, origin);
  }

  let profile = await env.PLAYERS.get(`player:${ipHash}`, 'json');
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, origin);

  const isFirstChange = profile.nameChangeCount === 0;

  if (!isFirstChange) {
    profile.stats = {};
    try {
      await env.DB.prepare('DELETE FROM leaderboard WHERE ip_hash = ?').bind(ipHash).run();
      await env.DB.prepare('DELETE FROM global_stats WHERE ip_hash = ?').bind(ipHash).run();
    } catch (e) { /* D1 may not exist yet */ }
  }

  profile.name = newName;
  profile.nameChangeCount += 1;
  profile.updatedAt = new Date().toISOString();
  await env.PLAYERS.put(`player:${ipHash}`, JSON.stringify(profile));

  return jsonResponse({
    name: profile.name,
    nameChangeCount: profile.nameChangeCount,
    statsWiped: !isFirstChange,
  }, 200, origin);
}
