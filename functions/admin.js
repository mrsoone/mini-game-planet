// Cloudflare Pages Function: Two-step auth for /admin
// Checks for HMAC-signed admin_auth cookie. If absent, shows login forms.
// Env vars required: ADMIN_PASSWORD, ADMIN_PIN, AUTH_SECRET

const LOGIN_STEP1_HTML = (error = '') => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Admin Login | MiniGamePlanet</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{fontFamily:{'sans':['"Space Grotesk"','system-ui','sans-serif'],'mono':['"DM Mono"','monospace']}}}}</script>
</head>
<body style="background:#F5F5F4;font-family:'Space Grotesk',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:380px;width:100%;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:40px;margin-bottom:8px;">🔒</div>
    <h1 style="font-size:20px;font-weight:700;color:#0F172A;">Admin Access</h1>
    <p style="font-size:12px;color:#94A3B8;margin-top:4px;">Step 1 of 2 — Enter password</p>
  </div>
  ${error ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px;margin-bottom:16px;font-size:13px;color:#DC2626;text-align:center;">${error}</div>` : ''}
  <form method="POST" action="/admin">
    <input type="hidden" name="step" value="1">
    <input type="password" name="password" placeholder="Password" autofocus required
      style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:10px;font-family:inherit;font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box;"
      onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'">
    <button type="submit"
      style="width:100%;padding:12px;background:#0F172A;color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">
      Continue →
    </button>
  </form>
  <a href="/" style="display:block;text-align:center;margin-top:16px;font-size:12px;color:#94A3B8;text-decoration:none;">← Back to MiniGamePlanet</a>
</div>
</body></html>`;

const LOGIN_STEP2_HTML = (token, error = '') => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Admin Login — Step 2 | MiniGamePlanet</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={theme:{extend:{fontFamily:{'sans':['"Space Grotesk"','system-ui','sans-serif'],'mono':['"DM Mono"','monospace']}}}}</script>
</head>
<body style="background:#F5F5F4;font-family:'Space Grotesk',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:380px;width:100%;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:40px;margin-bottom:8px;">🔐</div>
    <h1 style="font-size:20px;font-weight:700;color:#0F172A;">Admin Access</h1>
    <p style="font-size:12px;color:#94A3B8;margin-top:4px;">Step 2 of 2 — Enter PIN</p>
  </div>
  ${error ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px;margin-bottom:16px;font-size:13px;color:#DC2626;text-align:center;">${error}</div>` : ''}
  <form method="POST" action="/admin">
    <input type="hidden" name="step" value="2">
    <input type="hidden" name="token" value="${token}">
    <input type="password" name="pin" placeholder="PIN Code" autofocus required
      style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:10px;font-family:inherit;font-size:14px;outline:none;margin-bottom:12px;box-sizing:border-box;letter-spacing:4px;text-align:center;"
      onfocus="this.style.borderColor='#2563EB'" onblur="this.style.borderColor='#E5E7EB'">
    <button type="submit"
      style="width:100%;padding:12px;background:#0F172A;color:#fff;border:none;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;">
      🔓 Unlock Dashboard
    </button>
  </form>
  <a href="/" style="display:block;text-align:center;margin-top:16px;font-size:12px;color:#94A3B8;text-decoration:none;">← Back to MiniGamePlanet</a>
</div>
</body></html>`;

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacVerify(message, signature, secret) {
  const expected = await hmacSign(message, secret);
  return expected === signature;
}

function getCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function htmlResponse(html, status = 200) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const secret = env.AUTH_SECRET || 'dev-secret-not-for-production';
  const adminPassword = env.ADMIN_PASSWORD || '';
  const adminPin = env.ADMIN_PIN || '';

  // Check for valid auth cookie
  const authCookie = getCookie(request, 'admin_auth');
  if (authCookie) {
    const [payload, sig] = authCookie.split('.');
    if (payload && sig) {
      const valid = await hmacVerify(payload, sig, secret);
      if (valid) {
        try {
          const data = JSON.parse(atob(payload));
          if (data.exp > Date.now()) {
            return next();
          }
        } catch {}
      }
    }
  }

  // Handle POST (login form submissions)
  if (request.method === 'POST') {
    const formData = await request.formData();
    const step = formData.get('step');

    if (step === '1') {
      const password = formData.get('password') || '';
      if (!adminPassword) {
        return htmlResponse(LOGIN_STEP1_HTML('Admin credentials not configured. Set ADMIN_PASSWORD env var.'));
      }
      if (password !== adminPassword) {
        return htmlResponse(LOGIN_STEP1_HTML('Incorrect password. Please try again.'));
      }
      const token = await hmacSign(`step1:${Date.now()}`, secret);
      return htmlResponse(LOGIN_STEP2_HTML(token));
    }

    if (step === '2') {
      const pin = formData.get('pin') || '';
      if (pin !== adminPin) {
        const token = await hmacSign(`step1:${Date.now()}`, secret);
        return htmlResponse(LOGIN_STEP2_HTML(token, 'Incorrect PIN. Please try again.'));
      }

      const payload = btoa(JSON.stringify({ role: 'admin', exp: Date.now() + 86400000 }));
      const sig = await hmacSign(payload, secret);
      const cookieValue = `${payload}.${sig}`;

      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': `admin_auth=${encodeURIComponent(cookieValue)}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
        }
      });
    }
  }

  // Show Step 1 login form
  return htmlResponse(LOGIN_STEP1_HTML());
}
