// Cloudflare Pages Function: Clear admin auth cookie and redirect to /admin

export async function onRequest(context) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/admin',
      'Set-Cookie': 'admin_auth=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    }
  });
}
