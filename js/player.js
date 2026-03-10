const API_BASE = '/api';
let cachedPlayer = null;

export async function getPlayer() {
  if (cachedPlayer) return cachedPlayer;
  try {
    const resp = await fetch(`${API_BASE}/player`);
    if (!resp.ok) return null;
    cachedPlayer = await resp.json();
    return cachedPlayer;
  } catch { return null; }
}

export async function setPlayerName(newName) {
  try {
    const resp = await fetch(`${API_BASE}/player/name`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      return { error: err.error || 'Failed to change name' };
    }
    const result = await resp.json();
    cachedPlayer = null;
    return result;
  } catch { return { error: 'Network error' }; }
}

export async function submitStats(gameSlug, result) {
  try {
    const resp = await fetch(`${API_BASE}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_slug: gameSlug, ...result }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

export async function getLeaderboard(gameSlug) {
  try {
    const resp = await fetch(`${API_BASE}/leaderboard/${gameSlug}`);
    if (!resp.ok) return { entries: [], yourRank: 0, totalPlayers: 0 };
    return await resp.json();
  } catch { return { entries: [], yourRank: 0, totalPlayers: 0 }; }
}

export async function getGlobalLeaderboard() {
  try {
    const resp = await fetch(`${API_BASE}/leaderboard/global`);
    if (!resp.ok) return { entries: [] };
    return await resp.json();
  } catch { return { entries: [] }; }
}

export function renderIdentityBar(container, player) {
  if (!player || !container) return;
  let bar = document.getElementById('mgp-identity-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'mgp-identity-bar';
    bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 16px;font-size:14px;color:#64748B;font-family:"Space Grotesk",system-ui,sans-serif;';
    container.insertAdjacentElement('afterbegin', bar);
  }
  const emojis = window._mgpBannerEmojis || [];
  const leftEmojis = emojis.slice(0, 3).map(e => `<span class="mgp-banner-e">${e}</span>`).join('');
  const rightEmojis = emojis.slice(-3).map(e => `<span class="mgp-banner-e">${e}</span>`).join('');
  const leftHTML = leftEmojis ? `<span class="mgp-name-emojis">${leftEmojis}</span>` : '';
  const rightHTML = rightEmojis ? `<span class="mgp-name-emojis">${rightEmojis}</span>` : '';
  bar.innerHTML = `${leftHTML} Playing as <strong style="color:#0F172A;margin:0 2px;">${player.name}</strong> <button id="mgp-name-edit" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px;" title="Change name">✏️</button> ${rightHTML}`;

  const editBtn = document.getElementById('mgp-name-edit');
  if (editBtn) {
    editBtn.addEventListener('click', () => showNameModal(player), { once: true });
  }
}

function showNameModal(player) {
  const existing = document.getElementById('mgp-name-modal');
  if (existing) existing.remove();

  const isFirst = player.nameChangeCount === 0;
  const modal = document.createElement('div');
  modal.id = 'mgp-name-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:400px;width:90%;font-family:'Space Grotesk',system-ui,sans-serif;">
      <h3 style="margin:0 0 12px;font-size:18px;font-weight:700;">Change Display Name</h3>
      ${!isFirst ? '<p style="color:#DC2626;font-size:13px;margin:0 0 12px;">⚠️ Changing your name will <strong>permanently erase all your stats and leaderboard positions</strong> across every game. This cannot be undone.</p>' : ''}
      <input id="mgp-name-input" type="text" value="${player.name}" maxlength="20" style="width:100%;padding:10px 14px;border:2px solid #E5E7EB;border-radius:10px;font-size:15px;font-family:inherit;box-sizing:border-box;margin-bottom:12px;" placeholder="3-20 characters">
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="mgp-name-cancel" style="padding:8px 16px;border:2px solid #E5E7EB;border-radius:8px;background:#fff;cursor:pointer;font-family:inherit;font-weight:600;">Cancel</button>
        <button id="mgp-name-save" style="padding:8px 16px;border:none;border-radius:8px;background:${isFirst ? '#0F172A' : '#DC2626'};color:#fff;cursor:pointer;font-family:inherit;font-weight:600;">${isFirst ? 'Set Name' : 'Erase Everything & Change'}</button>
      </div>
      <p id="mgp-name-error" style="color:#DC2626;font-size:12px;margin:8px 0 0;display:none;"></p>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('mgp-name-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('mgp-name-save').addEventListener('click', async () => {
    const input = document.getElementById('mgp-name-input');
    const errEl = document.getElementById('mgp-name-error');
    const newName = input.value.trim();
    if (!newName || newName.length < 3 || newName.length > 20) {
      errEl.textContent = 'Name must be 3-20 characters.';
      errEl.style.display = 'block';
      return;
    }
    const result = await setPlayerName(newName);
    if (result.error) {
      errEl.textContent = result.error;
      errEl.style.display = 'block';
      return;
    }
    modal.remove();
    const p = await getPlayer();
    const container = document.querySelector('main') || document.body;
    renderIdentityBar(container, p);
  });
}

export async function renderLeaderboard(container, gameSlug) {
  if (!container) return;
  let panel = document.getElementById('mgp-leaderboard');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'mgp-leaderboard';
    panel.style.cssText = 'margin:16px 0;font-family:"Space Grotesk",system-ui,sans-serif;';
    container.appendChild(panel);
  }

  panel.innerHTML = '<p style="color:#64748B;font-size:13px;">Loading leaderboard...</p>';
  const data = await getLeaderboard(gameSlug);

  if (!data.entries.length) {
    panel.innerHTML = `
      <details style="border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;">
        <summary style="cursor:pointer;font-weight:700;font-size:15px;">🏆 Leaderboard</summary>
        <p style="color:#64748B;font-size:13px;margin:8px 0 0;">No scores yet. Be the first!</p>
      </details>`;
    return;
  }

  const rows = data.entries.map((e, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${e.rank}.`;
    return `<tr style="border-bottom:1px solid #F1F5F9;"><td style="padding:6px 8px;font-size:13px;">${medal}</td><td style="padding:6px 8px;font-weight:600;font-size:13px;">${e.name}</td><td style="padding:6px 8px;font-family:'DM Mono',monospace;font-size:13px;text-align:right;">${e.score}</td></tr>`;
  }).join('');

  panel.innerHTML = `
    <details style="border:2px solid #E5E7EB;border-radius:12px;padding:12px 16px;">
      <summary style="cursor:pointer;font-weight:700;font-size:15px;">🏆 Leaderboard <span style="font-weight:400;color:#64748B;font-size:12px;">(${data.totalPlayers} players)</span></summary>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tbody>${rows}</tbody>
      </table>
      ${data.yourRank ? `<p style="margin:8px 0 0;font-size:12px;color:#64748B;">Your rank: <strong>#${data.yourRank}</strong> of ${data.totalPlayers}</p>` : ''}
    </details>`;
}
