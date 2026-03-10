/**
 * GameRoom Durable Object
 * Manages WebSocket rooms with turn timer, team tracking, Elo, and rich game-over.
 */

const DEFAULT_TURN_TIMER = 30;
const K_FACTOR = 32;

function calcElo(ratingA, ratingB, scoreA) {
  const expected = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  return Math.round(ratingA + K_FACTOR * (scoreA - expected));
}

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.spectators = new Map();
    this.roomCode = null;
    this.gameSlug = null;
    this.maxPlayers = 2;
    this.roomState = 'waiting';
    this.turnIndex = 0;
    this.players = [];
    this.teams = false;
    this.settings = {};
    this.turnTimerSec = DEFAULT_TURN_TIMER;
    this.turnDeadline = null;
    this.turnTimerInterval = null;
    this.gameState = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get('room');
      if (stored) {
        Object.assign(this, stored);
        this.sessions = new Map();
        this.spectators = new Map();
        this.turnTimerInterval = null;
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
      teams: this.teams,
      settings: this.settings,
      turnTimerSec: this.turnTimerSec,
      turnDeadline: this.turnDeadline,
      gameState: this.gameState,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
    });
  }

  broadcast(data, excludeSession) {
    const msg = JSON.stringify(data);
    for (const [ws] of this.sessions) {
      if (ws !== excludeSession && ws.readyState === 1) {
        try { ws.send(msg); } catch {}
      }
    }
    for (const [ws] of this.spectators) {
      if (ws.readyState === 1) {
        try { ws.send(msg); } catch {}
      }
    }
  }

  broadcastPlayersOnly(data, excludeSession) {
    const msg = JSON.stringify(data);
    for (const [ws] of this.sessions) {
      if (ws !== excludeSession && ws.readyState === 1) {
        try { ws.send(msg); } catch {}
      }
    }
  }

  startTurnTimer() {
    this.stopTurnTimer();
    this.turnDeadline = Date.now() + this.turnTimerSec * 1000;
    let remaining = this.turnTimerSec;

    this.turnTimerInterval = setInterval(() => {
      remaining = Math.max(0, Math.round((this.turnDeadline - Date.now()) / 1000));
      this.broadcast({ type: 'timer_tick', remaining, turnIndex: this.turnIndex });

      if (remaining <= 0) {
        this.stopTurnTimer();
        this.broadcast({ type: 'timer_expired', turnIndex: this.turnIndex });
        this.advanceTurn();
      }
    }, 1000);
  }

  stopTurnTimer() {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
    this.turnDeadline = null;
  }

  async advanceTurn() {
    const activePlayers = this.players.filter(p => p.connected || p.isBot);
    if (activePlayers.length === 0) return;
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    await this.save();
    this.broadcast({ type: 'turn', turnIndex: this.turnIndex });
    if (this.roomState === 'playing') this.startTurnTimer();
  }

  assignTeams() {
    if (!this.teams || this.players.length < 2) return;
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].team = i % 2;
    }
  }

  async computeElo(result) {
    if (!result || !result.winner === undefined) return;
    const ranked = ['chess', 'checkers', 'connect-four', 'reversi', 'spades', 'hearts',
      'backgammon', 'gin-rummy', 'euchre', 'cribbage'];
    if (!ranked.includes(this.gameSlug)) return;

    const changes = [];
    try {
      for (const player of this.players) {
        if (player.isBot || !player.ipHash) continue;
        const profile = await this.env.PLAYERS.get(`player:${player.ipHash}`, 'json');
        if (!profile) continue;
        if (!profile.elo) profile.elo = {};
        const currentElo = profile.elo[this.gameSlug] || 1000;
        player._elo = currentElo;
        player._profile = profile;
      }

      const humans = this.players.filter(p => !p.isBot && p._profile);
      if (humans.length < 2) return;

      if (this.teams) {
        const team0 = humans.filter(p => p.team === 0);
        const team1 = humans.filter(p => p.team === 1);
        const avgElo0 = team0.reduce((s, p) => s + p._elo, 0) / (team0.length || 1);
        const avgElo1 = team1.reduce((s, p) => s + p._elo, 0) / (team1.length || 1);
        const score0 = result.winnerTeam === 0 ? 1 : result.winnerTeam === 1 ? 0 : 0.5;
        const score1 = 1 - score0;

        for (const p of team0) {
          const newElo = calcElo(p._elo, avgElo1, score0);
          p._profile.elo[this.gameSlug] = newElo;
          changes.push({ name: p.name, oldElo: p._elo, newElo, delta: newElo - p._elo });
          await this.env.PLAYERS.put(`player:${p.ipHash}`, JSON.stringify(p._profile));
        }
        for (const p of team1) {
          const newElo = calcElo(p._elo, avgElo0, score1);
          p._profile.elo[this.gameSlug] = newElo;
          changes.push({ name: p.name, oldElo: p._elo, newElo, delta: newElo - p._elo });
          await this.env.PLAYERS.put(`player:${p.ipHash}`, JSON.stringify(p._profile));
        }
      } else {
        const winner = humans.find(p => p.index === result.winner);
        const losers = humans.filter(p => p.index !== result.winner);
        if (winner) {
          const avgOpponentElo = losers.reduce((s, p) => s + p._elo, 0) / (losers.length || 1);
          const newElo = calcElo(winner._elo, avgOpponentElo, 1);
          winner._profile.elo[this.gameSlug] = newElo;
          changes.push({ name: winner.name, oldElo: winner._elo, newElo, delta: newElo - winner._elo });
          await this.env.PLAYERS.put(`player:${winner.ipHash}`, JSON.stringify(winner._profile));

          for (const p of losers) {
            const newE = calcElo(p._elo, winner._elo, 0);
            p._profile.elo[this.gameSlug] = newE;
            changes.push({ name: p.name, oldElo: p._elo, newElo: newE, delta: newE - p._elo });
            await this.env.PLAYERS.put(`player:${p.ipHash}`, JSON.stringify(p._profile));
          }
        }
      }
    } catch (e) { /* KV may fail */ }
    return changes;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      const body = await request.json();
      this.roomCode = body.roomCode;
      this.gameSlug = body.gameSlug;
      this.maxPlayers = body.maxPlayers || 2;
      this.teams = body.teams || false;
      this.settings = body.settings || {};
      this.turnTimerSec = body.settings?.turnTimer || DEFAULT_TURN_TIMER;
      this.roomState = 'waiting';
      this.players = [];
      this.gameState = null;
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
        teams: this.teams,
        spectators: this.spectators.size,
        settings: this.settings,
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

    const params = new URL(request.url).searchParams;
    const playerName = params.get('name') || 'Player';
    const spectate = params.get('spectate') === 'true';
    const ipHash = params.get('ip_hash') || null;

    if (spectate || this.players.length >= this.maxPlayers) {
      this.spectators.set(server, { name: playerName });
      server.send(JSON.stringify({ type: 'spectating', players: this.players.map(p => ({ name: p.name, index: p.index, team: p.team })), gameState: this.gameState }));
      this.broadcast({ type: 'spectator_count', count: this.spectators.size });
      return new Response(null, { status: 101, webSocket: client });
    }

    const playerIndex = this.players.length;
    const playerData = { name: playerName, index: playerIndex, connected: true, isBot: false, ipHash, team: undefined };
    this.players.push(playerData);
    this.sessions.set(server, { name: playerName, index: playerIndex, ipHash });
    this.lastActivity = Date.now();

    if (this.teams) this.assignTeams();
    await this.save();

    server.send(JSON.stringify({
      type: 'joined',
      playerIndex,
      yourIndex: playerIndex,
      players: this.players.map(p => ({ name: p.name, index: p.index, team: p.team, isBot: p.isBot })),
      roomCode: this.roomCode,
      gameSlug: this.gameSlug,
      settings: this.settings,
      gameState: this.gameState,
    }));

    this.broadcast({
      type: 'player_joined',
      player: { name: playerName, index: playerIndex, team: playerData.team },
      players: this.players.map(p => ({ name: p.name, index: p.index, team: p.team, isBot: p.isBot })),
    }, server);

    if (this.players.length >= 2 && this.roomState === 'waiting') {
      this.roomState = 'playing';
      this.turnIndex = 0;
      await this.save();
      const startMsg = {
        type: 'game_start',
        players: this.players.map(p => ({ name: p.name, index: p.index, team: p.team, isBot: p.isBot })),
        turnIndex: 0,
        settings: this.settings,
      };
      for (const [ws] of this.sessions) {
        const sess = this.sessions.get(ws);
        if (ws.readyState === 1) try { ws.send(JSON.stringify({ ...startMsg, yourIndex: sess.index })); } catch {}
      }
      this.startTurnTimer();
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    this.lastActivity = Date.now();
    const session = this.sessions.get(ws);
    const isSpectator = this.spectators.has(ws);
    if (!session && !isSpectator) return;
    if (isSpectator) return;

    let data;
    try { data = JSON.parse(message); } catch { return; }

    switch (data.type) {
      case 'move':
        this.broadcast({ type: 'move', move: data.move, playerIndex: session.index }, ws);
        if (data.endTurn) {
          this.stopTurnTimer();
          await this.advanceTurn();
        }
        break;

      case 'chat': {
        const validChats = ['hi', 'good_move', 'oops', 'nice', 'gg', 'rematch', 'ugh'];
        if (validChats.includes(data.messageId)) {
          this.broadcast({ type: 'chat', messageId: data.messageId, from: session.name, playerIndex: session.index }, ws);
        }
        break;
      }

      case 'system':
        if (data.text && data.text.length <= 200) {
          this.broadcast({ type: 'system', text: data.text, from: session.name }, ws);
        }
        break;

      case 'rematch':
        this.broadcast({ type: 'rematch_request', from: session.name, playerIndex: session.index }, ws);
        break;

      case 'game_over': {
        this.stopTurnTimer();
        this.roomState = 'finished';
        const eloChanges = await this.computeElo(data.result);
        await this.save();
        this.broadcast({
          type: 'game_over',
          result: data.result,
          playerIndex: session.index,
          eloChanges: eloChanges || [],
          stats: {
            duration: Math.round((Date.now() - this.createdAt) / 1000),
            players: this.players.map(p => ({ name: p.name, index: p.index, team: p.team })),
          },
        }, null);
        break;
      }

      case 'position':
        this.broadcast({ type: 'position', position: data.position, playerIndex: session.index }, ws);
        break;

      case 'state':
        this.gameState = data.state;
        await this.save();
        this.broadcast({ type: 'state', state: data.state, playerIndex: session.index }, ws);
        break;

      case 'settings':
        if (session.index === 0) {
          Object.assign(this.settings, data.settings);
          if (data.settings.turnTimer) this.turnTimerSec = data.settings.turnTimer;
          await this.save();
          this.broadcast({ type: 'settings_update', settings: this.settings });
        }
        break;
    }
  }

  async webSocketClose(ws, code, reason) {
    if (this.spectators.has(ws)) {
      this.spectators.delete(ws);
      this.broadcast({ type: 'spectator_count', count: this.spectators.size });
      return;
    }

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
          stillGone.isBot = true;
          await this.save();
          this.broadcast({
            type: 'player_disconnected',
            playerIndex: session.index,
            name: session.name,
            botTakeover: true,
          });
        }
      }, 15000);
    }

    if (this.sessions.size === 0 && this.spectators.size === 0) {
      this.stopTurnTimer();
      this.state.storage.deleteAlarm();
      this.state.storage.setAlarm(Date.now() + 30 * 60 * 1000);
    }
  }

  async webSocketError(ws, error) {
    await this.webSocketClose(ws, 1006, 'error');
  }

  async alarm() {
    if (this.sessions.size === 0 && this.spectators.size === 0) {
      this.stopTurnTimer();
      await this.state.storage.deleteAll();
    }
  }
}
