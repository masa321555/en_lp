/**
 * 合同会社en LP — Worker
 * 静的ファイルは Static Assets が配信。/api/contact だけをこのWorkerが処理する。
 * 必要な設定: Secrets RESEND_API_KEY（必須）, TURNSTILE_SECRET（任意）/ Vars CONTACT_TO, CONTACT_FROM
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 本番ドメイン以外（workers.dev / www）からのアクセスは本番へ301リダイレクト
    const CANONICAL_HOST = 'en-ai.co.jp';
    if (url.hostname !== CANONICAL_HOST && url.hostname !== 'localhost' && !url.hostname.startsWith('127.')) {
      url.hostname = CANONICAL_HOST; url.protocol = 'https:'; url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};

async function handleContact(request, env) {
  // 同一オリジンからの送信のみ受け付ける
  const origin = request.headers.get('Origin') || '';
  const self = new URL(request.url).origin;
  if (origin && origin !== self) return json({ ok: false, error: 'origin' }, 403);

  let form;
  try { form = await request.formData(); } catch (e) { return json({ ok: false, error: 'body' }, 400); }
  const get = (k) => String(form.get(k) || '').trim();

  // ハニーポット（人間には見えない欄。埋まっていたらボット）
  if (get('website')) return json({ ok: true });

  const company = get('company'), name = get('name'), email = get('email'), status = get('status'), task = get('task');
  if (!company || !name || !email || !status) return json({ ok: false, error: 'required' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'email' }, 400);
  if ([company, name, email].some((v) => v.length > 200) || task.length > 4000) return json({ ok: false, error: 'length' }, 400);

  // Turnstile（シークレットが設定されているときだけ検証）
  if (env.TURNSTILE_SECRET) {
    const token = get('cf-turnstile-response');
    if (!token) return json({ ok: false, error: 'turnstile' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip })
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!vr.success) return json({ ok: false, error: 'turnstile' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json({ ok: false, error: 'config' }, 500);

  const text = [
    'LPのフォームから相談の申し込みがありました。', '',
    `会社名: ${company}`, `お名前: ${name}`, `メール: ${email}`, `AIツールの導入状況: ${status}`, '',
    'AI化したい作業:', task || '（未記入）', '',
    `受信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: env.CONTACT_TO.split(',').map((s) => s.trim()),
      reply_to: email,
      subject: `【LP相談】${company} ${name}様`,
      text
    })
  });
  if (!res.ok) return json({ ok: false, error: 'send' }, 502);
  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
