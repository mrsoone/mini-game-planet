import { hashIP, getClientIP, jsonResponse } from '../utils/auth.js';

const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRoomCode() {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  return 'MGP-' + Array.from(buf).map(b => SAFE_CHARS[b % SAFE_CHARS.length]).join('');
}

export async function handleCreateRoom(request, env) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const { game_slug, max_players = 2 } = body;
  if (!game_slug) return jsonResponse({ error: 'game_slug required' }, 400, origin);

  const roomCode = generateRoomCode();
  const roomId = env.GAME_ROOM.idFromName(roomCode);
  const room = env.GAME_ROOM.get(roomId);

  await room.fetch(new Request('https://internal/init', {
    method: 'POST',
    body: JSON.stringify({ roomCode, gameSlug: game_slug, maxPlayers: max_players, creatorHash: ipHash }),
  }));

  return jsonResponse({ roomCode }, 200, origin);
}

export async function handleJoinRoom(request, env) {
  const origin = request.headers.get('Origin');
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, origin); }

  const { room_code } = body;
  if (!room_code) return jsonResponse({ error: 'room_code required' }, 400, origin);

  const roomId = env.GAME_ROOM.idFromName(room_code);
  const room = env.GAME_ROOM.get(roomId);

  const statusResp = await room.fetch(new Request('https://internal/status'));
  const status = await statusResp.json();
  if (!status.exists) return jsonResponse({ error: 'Room not found' }, 404, origin);
  if (status.state === 'full') return jsonResponse({ error: 'Room is full' }, 400, origin);

  return jsonResponse({ roomCode: room_code, wsPath: `/ws/room/${room_code}` }, 200, origin);
}

export async function handleMatchmake(request, env, gameSlug) {
  const ip = getClientIP(request);
  const ipHash = await hashIP(ip);
  const origin = request.headers.get('Origin');

  const lobbyId = env.GAME_LOBBY.idFromName(gameSlug);
  const lobby = env.GAME_LOBBY.get(lobbyId);

  const resp = await lobby.fetch(new Request('https://internal/join', {
    method: 'POST',
    body: JSON.stringify({ ipHash, gameSlug }),
  }));
  const result = await resp.json();

  if (result.roomCode) {
    return jsonResponse({ roomCode: result.roomCode, wsPath: `/ws/room/${result.roomCode}` }, 200, origin);
  }
  return jsonResponse({ status: 'waiting', wsPath: `/ws/lobby/${gameSlug}` }, 200, origin);
}

export function handleWebSocket(request, env, path) {
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'ws' && segments[1] === 'room' && segments[2]) {
    const roomCode = segments[2];
    const roomId = env.GAME_ROOM.idFromName(roomCode);
    const room = env.GAME_ROOM.get(roomId);
    return room.fetch(request);
  }
  if (segments[0] === 'ws' && segments[1] === 'lobby' && segments[2]) {
    const gameSlug = segments[2];
    const lobbyId = env.GAME_LOBBY.idFromName(gameSlug);
    const lobby = env.GAME_LOBBY.get(lobbyId);
    return lobby.fetch(request);
  }
  return new Response('Not found', { status: 404 });
}
