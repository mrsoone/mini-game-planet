/**
 * multiplayer.js — Room management, matchmaking, WebSocket communication
 * Supports partner teams, spectators, room settings, system chat
 */
const API_BASE = 'https://minigameplanet-api.clockedoutlockedin.workers.dev/api';
const WS_BASE = location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = location.host;

let ws = null;
let reconnectAttempts = 0;
let reconnectPath = null;
let reconnectName = null;
const MAX_RECONNECT = 3;
const handlers = {
  move: [], chat: [], playerJoin: [], playerLeave: [], start: [], turn: [],
  matchFound: [], gameOver: [], rematch: [], system: [], state: [],
  spectatorCount: [], queueCount: [], settings: [], timerTick: [],
};

let _players = [];
let _myIndex = -1;
let _roomCode = null;
let _spectatorCount = 0;
let _roomSettings = {};

function emit(event, data) {
  (handlers[event] || []).forEach(fn => fn(data));
}

function connect(path, playerName) {
  reconnectPath = path;
  reconnectName = playerName;
  return new Promise((resolve, reject) => {
    const url = `${WS_BASE}//${WS_HOST}${path}${path.includes('?') ? '&' : '?'}name=${encodeURIComponent(playerName)}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0;
      resolve(ws);
    };

    ws.onerror = (e) => reject(e);

    ws.onclose = () => {
      if (reconnectAttempts < MAX_RECONNECT && reconnectPath) {
        reconnectAttempts++;
        const delay = 1000 * Math.pow(2, reconnectAttempts);
        showReconnecting(true);
        setTimeout(() => {
          connect(reconnectPath, reconnectName)
            .then(() => showReconnecting(false))
            .catch(() => {});
        }, delay);
      }
    };

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      switch (data.type) {
        case 'move': emit('move', data); break;
        case 'chat': emit('chat', data); break;
        case 'system': emit('system', data); emit('chat', data); break;
        case 'player_joined': _players = data.players || _players; emit('playerJoin', data); break;
        case 'player_left': case 'player_disconnected': emit('playerLeave', data); break;
        case 'game_start': _players = data.players || _players; _myIndex = data.yourIndex ?? _myIndex; emit('start', data); break;
        case 'turn': emit('turn', data); break;
        case 'match_found': emit('matchFound', data); break;
        case 'game_over': emit('gameOver', data); break;
        case 'joined':
          _players = data.players || [];
          _myIndex = data.playerIndex ?? -1;
          _roomCode = data.roomCode;
          _roomSettings = data.settings || {};
          emit('start', data);
          break;
        case 'position': emit('move', data); break;
        case 'rematch_request': emit('rematch', data); break;
        case 'state': emit('state', data); break;
        case 'spectator_count': _spectatorCount = data.count; emit('spectatorCount', data); break;
        case 'queue_update': case 'queue_joined': emit('queueCount', data); break;
        case 'settings_update': _roomSettings = data.settings; emit('settings', data); break;
        case 'timer_tick': emit('timerTick', data); break;
        case 'timer_expired': emit('timerTick', { ...data, expired: true }); break;
      }
    };
  });
}

function showReconnecting(show) {
  let el = document.getElementById('mgp-reconnecting');
  if (show && !el) {
    el = document.createElement('div');
    el.id = 'mgp-reconnecting';
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#D97706;color:#fff;text-align:center;padding:8px;font-size:13px;font-family:"Space Grotesk",sans-serif;z-index:10000;';
    el.textContent = 'Reconnecting...';
    document.body.appendChild(el);
  } else if (!show && el) {
    el.remove();
  }
}

// --- Room Creation & Joining ---

export async function createRoom(gameSlug, maxPlayers = 2, options = {}) {
  const { teams = false, settings = {} } = options;
  const resp = await fetch(`${API_BASE}/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_slug: gameSlug, max_players: maxPlayers, teams, settings }),
  });
  return resp.json();
}

export async function joinRoom(roomCode, playerName = 'Player') {
  const resp = await fetch(`${API_BASE}/room/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_code: roomCode }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  await connect(data.wsPath, playerName);
  return data;
}

export async function findMatch(gameSlug, playerName = 'Player') {
  await connect(`/ws/lobby/${gameSlug}?game=${gameSlug}`, playerName);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve({ status: 'timeout' });
    }, 30000);

    onMatchFound((data) => {
      clearTimeout(timeout);
      if (ws) { try { ws.close(); } catch {} }
      connect(data.wsPath, playerName).then(() => resolve(data)).catch(reject);
    });
  });
}

// --- Sending Messages ---

export function sendMove(moveData, endTurn = true) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'move', move: moveData, endTurn }));
  }
}

export function sendPosition(posData) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'position', position: posData }));
  }
}

export function sendChat(messageId) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'chat', messageId }));
  }
}

export function sendSystem(text) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'system', text }));
  }
}

export function sendRematch() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'rematch' }));
  }
}

export function sendGameOver(result) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'game_over', result }));
  }
}

export function sendSettings(settings) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'settings', settings }));
  }
}

export function sendState(stateData) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'state', state: stateData }));
  }
}

// --- Event Handlers ---

export function onMove(cb) { handlers.move.push(cb); }
export function onChat(cb) { handlers.chat.push(cb); }
export function onPlayerJoin(cb) { handlers.playerJoin.push(cb); }
export function onPlayerLeave(cb) { handlers.playerLeave.push(cb); }
export function onStart(cb) { handlers.start.push(cb); }
export function onTurn(cb) { handlers.turn.push(cb); }
export function onMatchFound(cb) { handlers.matchFound.push(cb); }
export function onGameOver(cb) { handlers.gameOver.push(cb); }
export function onRematch(cb) { handlers.rematch.push(cb); }
export function onSystem(cb) { handlers.system.push(cb); }
export function onState(cb) { handlers.state.push(cb); }
export function onSpectatorCount(cb) { handlers.spectatorCount.push(cb); }
export function onQueueCount(cb) { handlers.queueCount.push(cb); }
export function onSettings(cb) { handlers.settings.push(cb); }
export function onTimerTick(cb) { handlers.timerTick.push(cb); }

// --- Getters ---

export function getPlayers() { return _players; }
export function getMyIndex() { return _myIndex; }
export function getRoomCode() { return _roomCode; }
export function getSpectatorCount() { return _spectatorCount; }
export function getRoomSettings() { return _roomSettings; }

export function getMyTeam() {
  const me = _players.find(p => p.index === _myIndex);
  return me?.team ?? null;
}

export function getTeammates() {
  const myTeam = getMyTeam();
  if (myTeam === null) return [];
  return _players.filter(p => p.team === myTeam && p.index !== _myIndex);
}

export function getOpponents() {
  const myTeam = getMyTeam();
  if (myTeam === null) return _players.filter(p => p.index !== _myIndex);
  return _players.filter(p => p.team !== myTeam);
}

// --- Connection Management ---

export function leaveRoom() {
  reconnectAttempts = MAX_RECONNECT;
  reconnectPath = null;
  if (ws) { try { ws.close(1000); } catch {} ws = null; }
  _players = [];
  _myIndex = -1;
  _roomCode = null;
  _spectatorCount = 0;
  _roomSettings = {};
  Object.keys(handlers).forEach(k => { handlers[k] = []; });
}

export function isConnected() {
  return ws && ws.readyState === 1;
}

// --- Chat ---

const CHAT_MESSAGES = {
  hi: '👋 Hi!',
  good_move: '👍 Nice!',
  oops: '😅 Oops!',
  nice: '🔥 GG',
  gg: '🤝 Rematch?',
  ugh: '😤 Ugh!',
};

export function getChatMessages() { return CHAT_MESSAGES; }

export function showChatToast(message, fromName) {
  const text = CHAT_MESSAGES[message] || message;
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;right:20px;background:#0F172A;color:#fff;padding:8px 16px;border-radius:10px;font-size:13px;font-family:"Space Grotesk",sans-serif;z-index:9999;opacity:0;transform:translateY(-8px);transition:opacity 0.2s,transform 0.2s;';
  toast.textContent = fromName ? `${fromName}: ${text}` : text;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = ''; });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

export function showSystemMessage(text) {
  showChatToast(text, null);
}

// --- UI Components ---

export function renderModeSelector(container, gameSlug, playerName, callbacks, options = {}) {
  const { onAI, onPrivate, onFind } = callbacks;
  const { maxPlayers = 2, teams = false, settingsConfig = null } = options;

  const sel = document.createElement('div');
  sel.id = 'mgp-mode-selector';
  sel.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:16px 0;font-family:"Space Grotesk",system-ui,sans-serif;';

  const btnStyle = 'flex:1 1 140px;max-width:200px;padding:14px 12px;border-radius:12px;cursor:pointer;text-align:center;font-family:inherit;font-weight:600;font-size:14px;border:2px solid #E5E7EB;background:#fff;color:#0F172A;transition:all 0.15s;';

  sel.innerHTML = `
    <button id="mgp-mode-ai" style="${btnStyle}">🤖<br>Play AI</button>
    <button id="mgp-mode-private" style="${btnStyle}">🔗<br>Private Room</button>
    <button id="mgp-mode-find" style="${btnStyle}">🌐<br>Find Match</button>`;

  container.insertAdjacentElement('afterbegin', sel);

  document.getElementById('mgp-mode-ai').addEventListener('click', () => {
    sel.remove();
    onAI();
  });

  document.getElementById('mgp-mode-private').addEventListener('click', async () => {
    sel.innerHTML = '<p style="color:#64748B;font-size:14px;">Creating room...</p>';
    const result = await createRoom(gameSlug, maxPlayers, { teams });
    if (result.roomCode) {
      let settingsHtml = '';
      if (settingsConfig) {
        settingsHtml = '<div id="mgp-room-settings" style="margin:8px 0;text-align:left;font-size:12px;">';
        for (const [key, cfg] of Object.entries(settingsConfig)) {
          settingsHtml += `<label style="display:block;margin:4px 0;"><span style="color:#64748B;">${cfg.label}:</span> <select id="mgp-setting-${key}" style="padding:2px 6px;border:1px solid #E5E7EB;border-radius:4px;font-size:12px;">`;
          cfg.options.forEach(o => { settingsHtml += `<option value="${o.value}" ${o.value === cfg.default ? 'selected' : ''}>${o.label}</option>`; });
          settingsHtml += '</select></label>';
        }
        settingsHtml += '</div>';
      }
      sel.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <p style="font-size:14px;margin:0 0 8px;">Share this code:</p>
          <p style="font-size:28px;font-weight:900;font-family:'DM Mono',monospace;letter-spacing:4px;margin:0 0 12px;">${result.roomCode}</p>
          <button id="mgp-copy-code" style="padding:6px 16px;border:2px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;">📋 Copy</button>
          ${settingsHtml}
          <p id="mgp-room-status" style="font-size:12px;color:#64748B;margin:8px 0 0;">Waiting for players... (1/${maxPlayers})</p>
          ${maxPlayers > 2 ? `<div style="margin-top:8px;"><button id="mgp-fill-ai" style="padding:4px 12px;border:1px solid #E5E7EB;border-radius:6px;background:#fff;cursor:pointer;font-size:11px;">Fill with AI</button></div>` : ''}
        </div>`;
      document.getElementById('mgp-copy-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(result.roomCode);
      });
      document.getElementById('mgp-fill-ai')?.addEventListener('click', () => {
        sel.remove();
        onPrivate();
      });

      onPlayerJoin((data) => {
        const statusEl = document.getElementById('mgp-room-status');
        if (statusEl) statusEl.textContent = `Players: ${data.players.length}/${maxPlayers}`;
      });

      await joinRoom(result.roomCode, playerName);
      onStart(() => { sel.remove(); onPrivate(); });
    }
  });

  document.getElementById('mgp-mode-find').addEventListener('click', async () => {
    sel.innerHTML = `<div style="text-align:center;padding:12px;">
      <p style="color:#64748B;font-size:14px;">Looking for opponent... ⏳</p>
      <p id="mgp-queue-count" style="font-size:11px;color:#94A3B8;margin-top:4px;"></p>
      <button id="mgp-find-cancel" style="margin-top:8px;padding:4px 12px;border:1px solid #E5E7EB;border-radius:6px;background:#fff;cursor:pointer;font-size:11px;">Cancel</button>
    </div>`;

    document.getElementById('mgp-find-cancel')?.addEventListener('click', () => {
      leaveRoom();
      sel.remove();
      renderModeSelector(container, gameSlug, playerName, callbacks, options);
    });

    onQueueCount((data) => {
      const el = document.getElementById('mgp-queue-count');
      if (el && data.queueSize) el.textContent = `${data.queueSize} player${data.queueSize !== 1 ? 's' : ''} looking`;
    });

    const result = await findMatch(gameSlug, playerName);
    if (result.status === 'timeout') {
      sel.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <p style="font-size:14px;">No players found right now.</p>
          <button id="mgp-find-retry" style="padding:8px 16px;border:2px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;margin:8px 4px;">🔄 Keep Waiting</button>
          <button id="mgp-find-ai" style="padding:8px 16px;border:none;border-radius:8px;background:#0F172A;color:#fff;cursor:pointer;font-family:inherit;margin:8px 4px;">🤖 Play AI</button>
        </div>`;
      document.getElementById('mgp-find-ai')?.addEventListener('click', () => { sel.remove(); onAI(); });
      document.getElementById('mgp-find-retry')?.addEventListener('click', async () => {
        sel.innerHTML = '<p style="color:#64748B;font-size:14px;">Looking for opponent... ⏳</p>';
        const retry = await findMatch(gameSlug, playerName);
        if (retry.status !== 'timeout') { sel.remove(); onFind(); }
      });
    } else {
      sel.remove();
      onFind();
    }
  });
}

export function renderQuickChat(container) {
  let panel = document.getElementById('mgp-quick-chat');
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'mgp-quick-chat';
  panel.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:8px 0;';
  Object.entries(CHAT_MESSAGES).forEach(([id, label]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'padding:4px 10px;border:1px solid #E5E7EB;border-radius:16px;background:#fff;cursor:pointer;font-size:12px;font-family:inherit;transition:background 0.1s;';
    btn.addEventListener('click', () => sendChat(id));
    btn.addEventListener('mouseenter', () => { btn.style.background = '#F1F5F9'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
    panel.appendChild(btn);
  });
  container.appendChild(panel);
}

export function renderSpectatorBadge(container) {
  let badge = document.getElementById('mgp-spectator-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'mgp-spectator-badge';
    badge.style.cssText = 'font-size:11px;color:#64748B;font-family:"Space Grotesk",sans-serif;';
    container.appendChild(badge);
  }
  onSpectatorCount((data) => {
    badge.textContent = data.count > 0 ? `👁 ${data.count} watching` : '';
  });
}

export function renderTurnTimer(container, durationSec = 30) {
  let timer = document.getElementById('mgp-turn-timer');
  if (!timer) {
    timer = document.createElement('div');
    timer.id = 'mgp-turn-timer';
    timer.style.cssText = 'font-family:"DM Mono",monospace;font-size:18px;font-weight:700;text-align:center;margin:4px 0;color:#0F172A;';
    container.appendChild(timer);
  }
  onTimerTick((data) => {
    const remaining = data.remaining ?? durationSec;
    timer.textContent = `⏱ ${remaining}s`;
    timer.style.color = remaining <= 10 ? '#DC2626' : '#0F172A';
    if (remaining <= 10) timer.style.animation = 'mgpBtnPulse 0.5s ease infinite';
    else timer.style.animation = '';
    if (data.expired) timer.textContent = '⏱ Time!';
  });
  return timer;
}

export function renderPlayerList(container, options = {}) {
  const { showTeams = false, showElo = false, accentColor = '#0F172A' } = options;
  let list = document.getElementById('mgp-player-list');
  if (!list) {
    list = document.createElement('div');
    list.id = 'mgp-player-list';
    list.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0;font-family:"Space Grotesk",sans-serif;';
    container.appendChild(list);
  }

  function update() {
    list.innerHTML = _players.map(p => {
      const isMe = p.index === _myIndex;
      const isBot = p.isBot;
      const border = isMe ? `2px solid ${accentColor}` : '2px solid #E5E7EB';
      const teamLabel = showTeams && p.team !== undefined ? ` <span style="font-size:10px;color:#64748B;">T${p.team + 1}</span>` : '';
      const eloLabel = showElo && p.elo ? ` <span style="font-size:10px;color:#94A3B8;font-family:'DM Mono',monospace;">(${p.elo})</span>` : '';
      const botLabel = isBot ? ' <span style="font-size:9px;color:#94A3B8;">(Bot)</span>' : '';
      return `<div style="padding:4px 12px;border-radius:8px;border:${border};background:#fff;font-size:13px;font-weight:${isMe ? '700' : '500'};white-space:nowrap;">
        ${p.name}${botLabel}${teamLabel}${eloLabel}
      </div>`;
    }).join('');
  }

  update();
  onPlayerJoin(() => update());
  onPlayerLeave(() => update());
  return list;
}
