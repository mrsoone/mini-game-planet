export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.roomCode = null;
    this.gameSlug = null;
    this.maxPlayers = 2;
    this.roomState = 'waiting';
    this.turnIndex = 0;
    this.players = [];
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('room');
      if (stored) {
        Object.assign(this, stored);
        this.sessions = new Map();
      }
    });
  }

  async save() {
    await this.state.storage.put('room', {
      roomCode: this.roomCode,
      gameSlug: this.gameSlug,
      maxPlayers: this.maxPlayers,
      roomState: this.roomState,
      turnIndex: this.turnIndex,
      players: this.players,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
    });
  }

  broadcast(data, excludeSession) {
    const msg = JSON.stringify(data);
    for (const [ws, session] of this.sessions) {
      if (ws !== excludeSession && ws.readyState === 1) {
        try { ws.send(msg); } catch {}
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      const body = await request.json();
      this.roomCode = body.roomCode;
      this.gameSlug = body.gameSlug;
      this.maxPlayers = body.maxPlayers || 2;
      this.roomState = 'waiting';
      this.players = [];
      this.createdAt = Date.now();
      this.lastActivity = Date.now();
      await this.save();
      return new Response('ok');
    }

    if (url.pathname === '/status') {
      return new Response(JSON.stringify({
        exists: !!this.roomCode,
        state: this.players.length >= this.maxPlayers ? 'full' : this.roomState,
        players: this.players.length,
        maxPlayers: this.maxPlayers,
        gameSlug: this.gameSlug,
      }));
    }

    const upgrade = request.headers.get('Upgrade');
    if (!upgrade || upgrade !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    if (!this.roomCode) {
      return new Response('Room not found', { status: 404 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);

    const playerName = new URL(request.url).searchParams.get('name') || 'Player';
    const playerIndex = this.players.length;
    this.players.push({ name: playerName, index: playerIndex, connected: true });
    this.sessions.set(server, { name: playerName, index: playerIndex });
    this.lastActivity = Date.now();
    await this.save();

    server.send(JSON.stringify({
      type: 'joined',
      playerIndex,
      players: this.players.map(p => ({ name: p.name, index: p.index })),
      roomCode: this.roomCode,
      gameSlug: this.gameSlug,
    }));

    this.broadcast({ type: 'player_joined', player: { name: playerName, index: playerIndex }, players: this.players.map(p => ({ name: p.name, index: p.index })) }, server);

    if (this.players.length >= 2 && this.roomState === 'waiting') {
      this.roomState = 'playing';
      this.turnIndex = 0;
      await this.save();
      const startMsg = { type: 'game_start', players: this.players.map(p => ({ name: p.name, index: p.index })), turnIndex: 0 };
      for (const [ws] of this.sessions) {
        if (ws.readyState === 1) try { ws.send(JSON.stringify(startMsg)); } catch {}
      }
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    this.lastActivity = Date.now();
    const session = this.sessions.get(ws);
    if (!session) return;

    let data;
    try { data = JSON.parse(message); } catch { return; }

    switch (data.type) {
      case 'move':
        this.broadcast({ type: 'move', move: data.move, playerIndex: session.index }, ws);
        if (data.endTurn) {
          this.turnIndex = (this.turnIndex + 1) % this.players.length;
          await this.save();
          const turnMsg = { type: 'turn', turnIndex: this.turnIndex };
          for (const [s] of this.sessions) {
            if (s.readyState === 1) try { s.send(JSON.stringify(turnMsg)); } catch {}
          }
        }
        break;

      case 'chat':
        const validChats = ['hi', 'good_move', 'oops', 'nice', 'gg', 'rematch'];
        if (validChats.includes(data.messageId)) {
          this.broadcast({ type: 'chat', messageId: data.messageId, from: session.name }, ws);
        }
        break;

      case 'rematch':
        this.broadcast({ type: 'rematch_request', from: session.name, playerIndex: session.index }, ws);
        break;

      case 'game_over':
        this.roomState = 'finished';
        await this.save();
        this.broadcast({ type: 'game_over', result: data.result, playerIndex: session.index }, ws);
        break;

      case 'position':
        this.broadcast({ type: 'position', position: data.position, playerIndex: session.index }, ws);
        break;
    }
  }

  async webSocketClose(ws, code, reason) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);
    if (session) {
      const p = this.players.find(pl => pl.index === session.index);
      if (p) p.connected = false;
      await this.save();

      this.broadcast({ type: 'player_left', playerIndex: session.index, name: session.name });

      setTimeout(async () => {
        const stillGone = this.players.find(pl => pl.index === session.index);
        if (stillGone && !stillGone.connected) {
          this.broadcast({ type: 'player_disconnected', playerIndex: session.index, name: session.name });
        }
      }, 15000);
    }

    if (this.sessions.size === 0) {
      this.state.storage.deleteAlarm();
      this.state.storage.setAlarm(Date.now() + 30 * 60 * 1000);
    }
  }

  async webSocketError(ws, error) {
    await this.webSocketClose(ws, 1006, 'error');
  }

  async alarm() {
    if (this.sessions.size === 0) {
      await this.state.storage.deleteAll();
    }
  }
}
