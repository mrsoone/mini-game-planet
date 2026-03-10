const API_BASE = '/api';
const WS_BASE = location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_HOST = location.host;

let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;
const handlers = { move: [], chat: [], playerJoin: [], playerLeave: [], start: [], turn: [], matchFound: [], gameOver: [] };

function emit(event, data) {
  (handlers[event] || []).forEach(fn => fn(data));
}

function connect(path, playerName) {
  return new Promise((resolve, reject) => {
    const url = `${WS_BASE}//${WS_HOST}${path}?name=${encodeURIComponent(playerName)}`;
    ws = new WebSocket(url);
    ws.onopen = () => { reconnectAttempts = 0; resolve(ws); };
    ws.onerror = (e) => reject(e);
    ws.onclose = () => {
      if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setTimeout(() => connect(path, playerName).catch(() => {}), 1000 * Math.pow(2, reconnectAttempts));
      }
    };
    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      switch (data.type) {
        case 'move': emit('move', data); break;
        case 'chat': emit('chat', data); break;
        case 'player_joined': emit('playerJoin', data); break;
        case 'player_left': case 'player_disconnected': emit('playerLeave', data); break;
        case 'game_start': emit('start', data); break;
        case 'turn': emit('turn', data); break;
        case 'match_found': emit('matchFound', data); break;
        case 'game_over': emit('gameOver', data); break;
        case 'joined': emit('start', data); break;
        case 'position': emit('move', data); break;
        case 'rematch_request': emit('rematch', data); break;
      }
    };
  });
}

export async function createRoom(gameSlug, maxPlayers = 2) {
  const resp = await fetch(`${API_BASE}/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game_slug: gameSlug, max_players: maxPlayers }),
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

export function onMove(cb) { handlers.move.push(cb); }
export function onChat(cb) { handlers.chat.push(cb); }
export function onPlayerJoin(cb) { handlers.playerJoin.push(cb); }
export function onPlayerLeave(cb) { handlers.playerLeave.push(cb); }
export function onStart(cb) { handlers.start.push(cb); }
export function onTurn(cb) { handlers.turn.push(cb); }
export function onMatchFound(cb) { handlers.matchFound.push(cb); }
export function onGameOver(cb) { handlers.gameOver.push(cb); }

export function getPlayers() {
  return ws ? ws._players || [] : [];
}

export function leaveRoom() {
  reconnectAttempts = MAX_RECONNECT;
  if (ws) { try { ws.close(1000); } catch {} ws = null; }
  Object.keys(handlers).forEach(k => { handlers[k] = []; });
}

export function isConnected() {
  return ws && ws.readyState === 1;
}

const CHAT_MESSAGES = {
  hi: '👋 Hi!',
  good_move: '👍 Good move!',
  oops: '😅 Oops!',
  nice: '🔥 Nice!',
  gg: '🤝 GG',
  rematch: '🔄 Rematch?',
};

export function getChatMessages() { return CHAT_MESSAGES; }

export function renderModeSelector(container, gameSlug, playerName, callbacks) {
  const { onAI, onPrivate, onFind } = callbacks;
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
    const result = await createRoom(gameSlug);
    if (result.roomCode) {
      sel.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <p style="font-size:14px;margin:0 0 8px;">Share this code:</p>
          <p style="font-size:28px;font-weight:900;font-family:'DM Mono',monospace;letter-spacing:4px;margin:0 0 12px;">${result.roomCode}</p>
          <button id="mgp-copy-code" style="padding:6px 16px;border:2px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;font-size:13px;">📋 Copy</button>
          <p style="font-size:12px;color:#64748B;margin:8px 0 0;">Waiting for players...</p>
        </div>`;
      document.getElementById('mgp-copy-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(result.roomCode);
      });
      await joinRoom(result.roomCode, playerName);
      onStart(() => { sel.remove(); onPrivate(); });
    }
  });

  document.getElementById('mgp-mode-find').addEventListener('click', async () => {
    sel.innerHTML = '<p style="color:#64748B;font-size:14px;">Looking for opponent... ⏳</p>';
    const result = await findMatch(gameSlug, playerName);
    if (result.status === 'timeout') {
      sel.innerHTML = `
        <div style="text-align:center;padding:12px;">
          <p style="font-size:14px;">No players found right now.</p>
          <button id="mgp-find-retry" style="padding:8px 16px;border:2px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;margin:8px 4px;">🔄 Keep Waiting</button>
          <button id="mgp-find-ai" style="padding:8px 16px;border:none;border-radius:8px;background:#0F172A;color:#fff;cursor:pointer;font-family:inherit;margin:8px 4px;">🤖 Play AI</button>
        </div>`;
      document.getElementById('mgp-find-ai')?.addEventListener('click', () => { sel.remove(); onAI(); });
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
    btn.style.cssText = 'padding:4px 10px;border:1px solid #E5E7EB;border-radius:16px;background:#fff;cursor:pointer;font-size:12px;font-family:inherit;';
    btn.addEventListener('click', () => sendChat(id));
    panel.appendChild(btn);
  });
  container.appendChild(panel);
}

export function showChatToast(message, fromName) {
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:80px;right:20px;background:#0F172A;color:#fff;padding:8px 16px;border-radius:10px;font-size:13px;font-family:"Space Grotesk",sans-serif;z-index:9999;animation:fadeUp 0.3s ease;';
  toast.textContent = `${fromName}: ${CHAT_MESSAGES[message] || message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
