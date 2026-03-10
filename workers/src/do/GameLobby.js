/**
 * GameLobby Durable Object
 * Matchmaking queue with skill-based buckets, queue count broadcasting, and partial-fill rooms.
 */

const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const BUCKET_TIMEOUT_MS = 15000;

function generateRoomCode() {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  return 'MGP-' + Array.from(buf).map(b => SAFE_CHARS[b % SAFE_CHARS.length]).join('');
}

function getSkillBucket(gamesPlayed) {
  if (gamesPlayed <= 10) return 'new';
  if (gamesPlayed <= 50) return 'regular';
  return 'veteran';
}

export class GameLobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.queue = [];
    this.waitingSockets = new Map();
    this.broadcastInterval = null;
  }

  startBroadcastInterval() {
    if (this.broadcastInterval) return;
    this.broadcastInterval = setInterval(() => {
      this.broadcastQueueCount();
    }, 3000);
  }

  stopBroadcastInterval() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  broadcastQueueCount() {
    const alive = this.queue.filter(e => e.ws.readyState === 1);
    this.queue = alive;
    const msg = JSON.stringify({ type: 'queue_update', queueSize: alive.length });
    for (const entry of alive) {
      try { entry.ws.send(msg); } catch {}
    }
    if (alive.length === 0) this.stopBroadcastInterval();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/join' && request.method === 'POST') {
      return new Response(JSON.stringify({ status: 'use_websocket', queueSize: this.queue.length }));
    }

    if (url.pathname === '/status') {
      return new Response(JSON.stringify({ queueSize: this.queue.length }));
    }

    const upgrade = request.headers.get('Upgrade');
    if (!upgrade || upgrade !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);

    const params = new URL(request.url).searchParams;
    const gameSlug = params.get('game') || 'unknown';
    const playerName = params.get('name') || 'Player';
    const gamesPlayed = parseInt(params.get('gp') || '0', 10);
    const maxPlayers = parseInt(params.get('max') || '2', 10);
    const wantTeam = params.get('team') === 'true';
    const partialRoom = params.get('room') || null;

    const bucket = getSkillBucket(gamesPlayed);

    this.queue.push({
      ws: server,
      name: playerName,
      joinedAt: Date.now(),
      bucket,
      maxPlayers,
      wantTeam,
      partialRoom,
      gameSlug,
    });
    this.waitingSockets.set(server, { name: playerName, gameSlug });

    server.send(JSON.stringify({ type: 'queue_joined', position: this.queue.length, queueSize: this.queue.length }));
    this.startBroadcastInterval();

    await this.tryMatch(gameSlug, maxPlayers);

    return new Response(null, { status: 101, webSocket: client });
  }

  async tryMatch(gameSlug, requiredPlayers = 2) {
    this.queue = this.queue.filter(e => e.ws.readyState === 1);

    // Group by required player count
    const groups = {};
    for (const entry of this.queue) {
      const key = `${entry.gameSlug}-${entry.maxPlayers}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }

    for (const [key, entries] of Object.entries(groups)) {
      const needed = entries[0].maxPlayers;
      const slug = entries[0].gameSlug;

      // Attempt skill-based matching first: same bucket
      const buckets = { new: [], regular: [], veteran: [] };
      for (const e of entries) buckets[e.bucket].push(e);

      for (const bucketName of ['new', 'regular', 'veteran']) {
        while (buckets[bucketName].length >= needed) {
          const matched = buckets[bucketName].splice(0, needed);
          await this.createMatchRoom(matched, slug, needed);
        }
      }

      // After BUCKET_TIMEOUT_MS, match across buckets
      const remaining = entries.filter(e => this.queue.includes(e));
      const crossBucket = remaining.filter(e => Date.now() - e.joinedAt > BUCKET_TIMEOUT_MS);
      while (crossBucket.length >= needed) {
        const matched = crossBucket.splice(0, needed);
        await this.createMatchRoom(matched, slug, needed);
      }
    }

    this.broadcastQueueCount();
  }

  async createMatchRoom(matched, gameSlug, maxPlayers) {
    const roomCode = generateRoomCode();
    const roomId = this.env.GAME_ROOM.idFromName(roomCode);
    const room = this.env.GAME_ROOM.get(roomId);

    const hasTeam = matched.some(e => e.wantTeam);
    await room.fetch(new Request('https://internal/init', {
      method: 'POST',
      body: JSON.stringify({ roomCode, gameSlug, maxPlayers, teams: hasTeam }),
    }));

    const matchMsg = JSON.stringify({ type: 'match_found', roomCode, wsPath: `/ws/room/${roomCode}` });
    for (const entry of matched) {
      try { entry.ws.send(matchMsg); } catch {}
      this.queue = this.queue.filter(e => e !== entry);
      this.waitingSockets.delete(entry.ws);
    }
  }

  async webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    if (data.type === 'cancel') {
      this.queue = this.queue.filter(e => e.ws !== ws);
      this.waitingSockets.delete(ws);
      try { ws.close(1000, 'cancelled'); } catch {}
      this.broadcastQueueCount();
    }
  }

  async webSocketClose(ws) {
    this.queue = this.queue.filter(e => e.ws !== ws);
    this.waitingSockets.delete(ws);
    this.broadcastQueueCount();
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}
