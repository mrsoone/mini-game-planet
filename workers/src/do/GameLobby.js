export class GameLobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.queue = [];
    this.waitingSockets = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/join' && request.method === 'POST') {
      const body = await request.json();
      return new Response(JSON.stringify({ status: 'use_websocket' }));
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

    const gameSlug = new URL(request.url).searchParams.get('game') || 'unknown';
    const playerName = new URL(request.url).searchParams.get('name') || 'Player';

    this.queue.push({ ws: server, name: playerName, joinedAt: Date.now() });
    this.waitingSockets.set(server, { name: playerName, gameSlug });

    server.send(JSON.stringify({ type: 'queue_joined', position: this.queue.length }));

    await this.tryMatch(gameSlug);

    return new Response(null, { status: 101, webSocket: client });
  }

  async tryMatch(gameSlug) {
    while (this.queue.length >= 2) {
      const p1 = this.queue.shift();
      const p2 = this.queue.shift();

      if (p1.ws.readyState !== 1) { this.queue.unshift(p2); continue; }
      if (p2.ws.readyState !== 1) { this.queue.unshift(p1); continue; }

      const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const buf = new Uint8Array(4);
      crypto.getRandomValues(buf);
      const roomCode = 'MGP-' + Array.from(buf).map(b => SAFE_CHARS[b % SAFE_CHARS.length]).join('');

      const roomId = this.env.GAME_ROOM.idFromName(roomCode);
      const room = this.env.GAME_ROOM.get(roomId);

      await room.fetch(new Request('https://internal/init', {
        method: 'POST',
        body: JSON.stringify({ roomCode, gameSlug, maxPlayers: 2 }),
      }));

      const matchMsg = JSON.stringify({ type: 'match_found', roomCode, wsPath: `/ws/room/${roomCode}` });
      try { p1.ws.send(matchMsg); } catch {}
      try { p2.ws.send(matchMsg); } catch {}

      this.waitingSockets.delete(p1.ws);
      this.waitingSockets.delete(p2.ws);
    }

    for (const entry of this.queue) {
      if (entry.ws.readyState === 1) {
        entry.ws.send(JSON.stringify({ type: 'queue_update', position: this.queue.indexOf(entry) + 1, queueSize: this.queue.length }));
      }
    }
  }

  async webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    if (data.type === 'cancel') {
      this.queue = this.queue.filter(e => e.ws !== ws);
      this.waitingSockets.delete(ws);
      try { ws.close(1000, 'cancelled'); } catch {}
    }
  }

  async webSocketClose(ws) {
    this.queue = this.queue.filter(e => e.ws !== ws);
    this.waitingSockets.delete(ws);
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}
