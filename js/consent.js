// MiniGamePlanet — Cookie Consent Banner + Google Consent Mode v2
// GDPR/CCPA-compliant. Saves preference to localStorage.
// Upgrades GA4 consent on accept. Loads AdSense only after ad consent.

const STORAGE_KEY = 'mgp_cookie_consent';
let bannerEl = null;

function getConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveConsent(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function applyConsent(prefs) {
  if (typeof gtag !== 'function') return;
  gtag('consent', 'update', {
    'analytics_storage': prefs.analytics ? 'granted' : 'denied',
    'ad_storage': prefs.advertising ? 'granted' : 'denied',
    'ad_user_data': prefs.advertising ? 'granted' : 'denied',
    'ad_personalization': prefs.advertising ? 'granted' : 'denied'
  });

  if (prefs.advertising) loadAdSense();
}

function loadAdSense() {
  if (document.querySelector('script[src*="pagead2.googlesyndication.com"]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX';
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

export function hasAnalyticsConsent() {
  const prefs = getConsent();
  return prefs?.analytics === true;
}

export function hasAdConsent() {
  const prefs = getConsent();
  return prefs?.advertising === true;
}

function dismiss() {
  if (bannerEl) {
    bannerEl.style.transform = 'translateY(100%)';
    setTimeout(() => bannerEl?.remove(), 300);
    bannerEl = null;
  }
}

function buildBanner() {
  const el = document.createElement('div');
  el.id = 'consent-banner';
  Object.assign(el.style, {
    position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '9999',
    background: '#FFFFFF', borderTop: '2px solid #E5E7EB',
    borderRadius: '16px 16px 0 0',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
    padding: '20px 24px', fontFamily: '"Space Grotesk", system-ui, sans-serif',
    transition: 'transform 0.3s ease', transform: 'translateY(100%)'
  });

  let analyticsOn = false;
  let advertisingOn = false;
  let customizeOpen = false;

  function render() {
    el.innerHTML = `
      <div style="max-width:960px;margin:0 auto;">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:240px;">
            <p style="margin:0 0 4px;font-weight:700;font-size:15px;color:#0F172A;">🍪 Cookie Preferences</p>
            <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
              We use cookies for analytics and to improve your experience.
              <a href="/cookies" style="color:#2563EB;text-decoration:underline;">Learn more</a>
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button id="c-reject" style="padding:8px 16px;border-radius:8px;border:2px solid #E5E7EB;background:#fff;color:#334155;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Reject Non-Essential</button>
            <button id="c-customize" style="padding:8px 16px;border-radius:8px;border:none;background:none;color:#2563EB;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">${customizeOpen ? 'Hide Options' : 'Customize'}</button>
            <button id="c-accept" style="padding:8px 16px;border-radius:8px;border:none;background:#0F172A;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Accept All</button>
          </div>
        </div>
        ${customizeOpen ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #E5E7EB;">
          <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:#94A3B8;font-weight:600;">Essential</span>
              <div style="width:36px;height:20px;border-radius:10px;background:#059669;position:relative;cursor:not-allowed;opacity:0.7;">
                <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;right:2px;"></div>
              </div>
              <span style="font-size:11px;color:#94A3B8;">Always on</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:#334155;font-weight:600;">Analytics</span>
              <div id="c-toggle-analytics" style="width:36px;height:20px;border-radius:10px;background:${analyticsOn ? '#059669' : '#CBD5E1'};position:relative;cursor:pointer;transition:background 0.2s;">
                <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;${analyticsOn ? 'right:2px' : 'left:2px'};transition:all 0.2s;"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;color:#334155;font-weight:600;">Advertising</span>
              <div id="c-toggle-ads" style="width:36px;height:20px;border-radius:10px;background:${advertisingOn ? '#059669' : '#CBD5E1'};position:relative;cursor:pointer;transition:background 0.2s;">
                <div style="width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;${advertisingOn ? 'right:2px' : 'left:2px'};transition:all 0.2s;"></div>
              </div>
            </div>
            <button id="c-save" style="padding:6px 14px;border-radius:8px;border:none;background:#0F172A;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-left:auto;">Save Preferences</button>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    el.querySelector('#c-accept').addEventListener('click', () => {
      const prefs = { analytics: true, advertising: true };
      saveConsent(prefs);
      applyConsent(prefs);
      dismiss();
    });

    el.querySelector('#c-reject').addEventListener('click', () => {
      const prefs = { analytics: false, advertising: false };
      saveConsent(prefs);
      applyConsent(prefs);
      dismiss();
    });

    el.querySelector('#c-customize').addEventListener('click', () => {
      customizeOpen = !customizeOpen;
      render();
    });

    if (customizeOpen) {
      el.querySelector('#c-toggle-analytics').addEventListener('click', () => {
        analyticsOn = !analyticsOn;
        render();
      });
      el.querySelector('#c-toggle-ads').addEventListener('click', () => {
        advertisingOn = !advertisingOn;
        render();
      });
      el.querySelector('#c-save').addEventListener('click', () => {
        const prefs = { analytics: analyticsOn, advertising: advertisingOn };
        saveConsent(prefs);
        applyConsent(prefs);
        dismiss();
      });
    }
  }

  render();
  return el;
}

export function openConsentBanner() {
  dismiss();
  bannerEl = buildBanner();
  document.body.appendChild(bannerEl);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { bannerEl.style.transform = 'translateY(0)'; });
  });
}

export function initConsent() {
  const saved = getConsent();
  if (saved) {
    applyConsent(saved);
    return;
  }
  openConsentBanner();
}
