// MiniGamePlanet — Shared Gamepad API Controller Module
// Standard gamepad mapping (Xbox layout). Polls at 60fps via rAF.

const BUTTON_MAP = {
  0: 'a', 1: 'b', 2: 'x', 3: 'y',
  4: 'lb', 5: 'rb',
  6: 'lt', 7: 'rt',
  8: 'select', 9: 'start',
  10: 'ls', 11: 'rs',
  12: 'up', 13: 'down', 14: 'left', 15: 'right'
};

let polling = false;
let rafId = null;
let prevButtons = {};
let pressCallbacks = {};
let releaseCallbacks = {};
let anyButtonCallback = null;
let connected = false;
let toastEl = null;
let toastTimer = null;

function showToast(msg) {
  if (toastEl) toastEl.remove();
  toastEl = document.createElement('div');
  toastEl.textContent = msg;
  Object.assign(toastEl.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '9998',
    background: '#0F172A', color: '#fff', padding: '10px 18px',
    borderRadius: '8px', fontFamily: '"Space Grotesk", system-ui, sans-serif',
    fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    transition: 'opacity 0.3s', opacity: '0'
  });
  document.body.appendChild(toastEl);
  requestAnimationFrame(() => { toastEl.style.opacity = '1'; });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (toastEl) { toastEl.style.opacity = '0'; setTimeout(() => toastEl?.remove(), 300); }
  }, 3000);
}

function getGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gamepads) {
    if (gp && gp.connected) return gp;
  }
  return null;
}

function poll() {
  if (!polling) return;
  const gp = getGamepad();
  if (gp) {
    const currentButtons = {};
    for (let i = 0; i < gp.buttons.length; i++) {
      const name = BUTTON_MAP[i];
      if (!name) continue;
      const pressed = gp.buttons[i].pressed;
      currentButtons[name] = pressed;

      if (pressed && !prevButtons[name]) {
        if (pressCallbacks[name]) pressCallbacks[name].forEach(cb => cb());
        if (anyButtonCallback) anyButtonCallback(name);
      }
      if (!pressed && prevButtons[name]) {
        if (releaseCallbacks[name]) releaseCallbacks[name].forEach(cb => cb());
      }
    }
    prevButtons = currentButtons;
  }
  rafId = requestAnimationFrame(poll);
}

export function initGamepad() {
  if (polling) return;

  window.addEventListener('gamepadconnected', (e) => {
    connected = true;
    showToast('🎮 Controller connected');
    if (!polling) {
      polling = true;
      poll();
    }
  });

  window.addEventListener('gamepaddisconnected', () => {
    connected = false;
    prevButtons = {};
    showToast('🎮 Controller disconnected');
  });

  const gp = getGamepad();
  if (gp) {
    connected = true;
    polling = true;
    poll();
  }
}

export function isGamepadConnected() {
  return connected;
}

export function getGamepadState() {
  const gp = getGamepad();
  if (!gp) return null;

  const buttons = {};
  for (let i = 0; i < gp.buttons.length; i++) {
    const name = BUTTON_MAP[i];
    if (name) buttons[name] = gp.buttons[i].pressed;
  }

  const axes = {
    leftX: gp.axes[0] || 0,
    leftY: gp.axes[1] || 0,
    rightX: gp.axes[2] || 0,
    rightY: gp.axes[3] || 0
  };

  return { buttons, axes };
}

export function onButtonPress(buttonName, callback) {
  if (!pressCallbacks[buttonName]) pressCallbacks[buttonName] = [];
  pressCallbacks[buttonName].push(callback);
}

export function onButtonRelease(buttonName, callback) {
  if (!releaseCallbacks[buttonName]) releaseCallbacks[buttonName] = [];
  releaseCallbacks[buttonName].push(callback);
}

export function onAnyButton(callback) {
  anyButtonCallback = callback;
}

export function destroyGamepad() {
  polling = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  prevButtons = {};
  pressCallbacks = {};
  releaseCallbacks = {};
  anyButtonCallback = null;
  connected = false;
  if (toastEl) toastEl.remove();
}
