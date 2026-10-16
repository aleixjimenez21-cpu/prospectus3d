import { configuration, contactHandler, notificationHandler, validate, type Config, type Fetcher, RECIPIENT } from '../supabase/functions/_shared/contact.ts';
function assert(ok: unknown, message = 'Assertion failed'): void { if (!ok) throw new Error(message); }
const config: Config = { url: 'https://testproject.supabase.co', key: 'sb_secret_TEST_ONLY', resend: 're_TEST_ONLY', from: 'solicitudes@prospectus3d.com', turnstile: 'TEST_ONLY', hash: 'h'.repeat(32), worker: 'w'.repeat(32), origins: ['https://prospectus3d.com'] };
const sample = () => ({ request_id: crypto.randomUUID(), name: 'Prueba Técnica', company: 'Empresa de prueba', email: 'qa@example.com', phone: '+34 600 000 000', homes: 24, stage: 'En planificación', message: 'PRUEBA AUTOMÁTICA SIN ENVÍO REAL', language: 'es', website: '', token: 'test-token' });
const req = (data: unknown, extra: RequestInit = {}) => new Request('https://testproject.supabase.co/functions/v1/contact', { method: 'POST', headers: { origin: config.origins[0], 'Content-Type': 'application/json' }, body: JSON.stringify(data), ...extra });
function stub(options: { captcha?: unknown; dbError?: string; emailStatus?: number; finaliseFail?: boolean } = {}) {
  const calls: { url: string; body: any; headers: Headers }[] = [];
  let saved: any;
  const send: Fetcher = async (input, init) => {
    const url = String(input); const data = JSON.parse(String(init?.body || '{}'));
    calls.push({ url, body: data, headers: new Headers(init?.headers) });
    if (url.includes('siteverify')) return Response.json(options.captcha || { success: true, hostname: 'prospectus3d.com', action: 'contact' });
    if (url.endsWith('accept_contact_request')) {
      if (options.dbError) return Response.json({ message: options.dbError }, { status: 400 });
      saved = data.p_request; return Response.json({ id: saved.request_id, duplicate: false });
    }
    if (url.endsWith('claim_contact_notifications')) return Response.json(saved ? [{ ...saved, id: saved.request_id, notification_lease: crypto.randomUUID() }] : []);
    if (url === 'https://api.resend.com/emails') return Response.json({ id: 'provider-test-id' }, { status: options.emailStatus || 200 });
    if (url.endsWith('finish_contact_notification')) return Response.json(!options.finaliseFail, { status: options.finaliseFail ? 503 : 200 });
    throw new Error(`Unexpected request: ${url}`);
  };
  return { calls, send, saved: () => saved };
}
Deno.test('valid request is saved before email; recipient fixed; no credentials or PII returned', async () => {
  const s = stub(); const payload = sample();
  const result = await contactHandler(() => config, s.send)(req({ ...payload, to: 'attacker@example.org', from: 'attacker@example.org' }));
  assert(result.status === 201); const returned = await result.json();
  assert(JSON.stringify(returned) === JSON.stringify({ ok: true, request_id: payload.request_id }));
  assert(s.calls[1].url.endsWith('accept_contact_request'));
  const mail = s.calls.find(c => c.url === 'https://api.resend.com/emails')!;
  assert(mail.body.to.length === 1 && mail.body.to[0] === RECIPIENT);
  assert(mail.body.reply_to === payload.email && mail.body.from === `Prospectus 3D <${config.from}>`);
  assert(!mail.body.html && mail.headers.get('Idempotency-Key') === `prospectus-contact/${payload.request_id}`);
  assert(!JSON.stringify(returned).includes(payload.email) && !JSON.stringify(returned).includes(config.key));
  assert(s.calls[1].headers.get('apikey') === config.key && !s.calls[1].headers.has('authorization'));
});
Deno.test('email failure leaves accepted request intact and queues retry', async () => {
  const s = stub({ emailStatus: 503 }); const result = await contactHandler(() => config, s.send)(req(sample()));
  assert(result.status === 201 && s.saved());
  const last = s.calls.at(-1)!; assert(last.body.p_provider_id === null && last.body.p_error === 'email_http_503');
});
Deno.test('failed notification finalisation does not lie about stored request', async () => {
  const s = stub({ finaliseFail: true }); assert((await contactHandler(() => config, s.send)(req(sample()))).status === 201);
});
Deno.test('storage failure never sends email or returns success', async () => {
  const s = stub({ dbError: 'database_unavailable' }); const result = await contactHandler(() => config, s.send)(req(sample()));
  assert(result.status === 503 && s.calls.length === 2);
});
Deno.test('rate limit and conflicting idempotency ids return honest errors', async () => {
  for (const [error, status] of [['rate_limited', 429], ['idempotency_conflict', 409]] as const) {
    const s = stub({ dbError: error }); const result = await contactHandler(() => config, s.send)(req(sample()));
    assert(result.status === status && s.calls.length === 2);
    if (status === 429) assert(result.headers.get('retry-after') === '3600');
  }
});
Deno.test('CAPTCHA failure, wrong hostname, wrong action cannot access database', async () => {
  for (const captcha of [{ success: false }, { success: true, hostname: 'attacker.org', action: 'contact' }, { success: true, hostname: 'prospectus3d.com', action: 'login' }]) {
    const s = stub({ captcha }); assert((await contactHandler(() => config, s.send)(req(sample()))).status === 400 && s.calls.length === 1);
  }
});
Deno.test('invalid fields, header injection, honeypot and invalid JSON are rejected before any service calls', async () => {
  const invalid = [null, [], {}, ...[
    { email: 'x\r\nBcc:evil@example.org' }, { email: 'not-email' }, { homes: '24' }, { homes: 0 }, { homes: 1.3 }, { homes: 100001 },
    { company: ' ' }, { name: 'a' }, { name: 'a'.repeat(151) }, { phone: 'invalid phone' }, { stage: 'injected' },
    { token: '' }, { token: 'x'.repeat(2049) }, { website: 'spam.example' }, { message: 'x'.repeat(2001) }, { language: 'fr' }, { request_id: 'invalid' },
  ].map(change => ({ ...sample(), ...change }))];
  const s = stub(); const handler = contactHandler(() => config, s.send);
  for (const data of invalid) assert((await handler(req(data))).status === 400, JSON.stringify(data));
  assert((await handler(req({}, { body: '{bad json' }))).status === 400);
  assert(s.calls.length === 0);
});
Deno.test('oversized body is rejected even without content-length', async () => {
  const s = stub(); const result = await contactHandler(() => config, s.send)(req({ ...sample(), message: 'ñ'.repeat(17000) }));
  assert(result.status === 413 && s.calls.length === 0);
});
Deno.test('only expected origin, method and JSON content are accepted', async () => {
  const s = stub(); const handler = contactHandler(() => config, s.send);
  assert((await handler(req(sample(), { headers: { origin: 'https://attacker.org', 'Content-Type': 'application/json' } }))).status === 403);
  assert((await handler(req(sample(), { headers: { 'Content-Type': 'application/json' } }))).status === 403);
  assert((await handler(req(sample(), { headers: { origin: config.origins[0], 'Content-Type': 'text/plain' } }))).status === 415);
  const get = new Request('https://test.example', { headers: { origin: config.origins[0] } });
  assert((await handler(get)).status === 405);
  const preflight = await handler(new Request('https://test.example', { method: 'OPTIONS', headers: { origin: config.origins[0] } }));
  assert(preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === config.origins[0]);
  assert(s.calls.length === 0);
});
Deno.test('missing configuration fails closed', async () => {
  const s = stub(); const handler = contactHandler(() => configuration(() => undefined), s.send);
  assert((await handler(req(sample()))).status === 503 && s.calls.length === 0);
});
Deno.test('worker requires separate secret; public endpoint cannot trigger it', async () => {
  const s = stub(); const handler = notificationHandler(() => config, s.send);
  assert((await handler(req({}))).status === 401 && s.calls.length === 0);
  assert((await handler(req({}, { headers: { authorization: `Bearer ${config.key}` } }))).status === 401);
  assert((await handler(req({}, { headers: { authorization: `Bearer ${config.worker}` } }))).status === 200);
  assert(s.calls.length === 1);
});
Deno.test('normalises email and permits international names, phone separators and multiline text', () => {
  const { lead } = validate({ ...sample(), email: '  Contact@Example.COM ', name: 'João García', message: 'Primera línea\nSegunda línea' });
  assert(lead.email === 'contact@example.com' && lead.message.includes('\n'));
});

Deno.test('SQL-looking free text is sent only as JSON data to fixed RPCs and plaintext email', async () => {
  const attacks = ["' OR '1'='1' --", "'; DROP TABLE contact_requests; --", "x'); SELECT pg_sleep(0.05); --", "$$; SELECT current_user; --"];
  const allowed = new Set([
    'https://challenges.cloudflare.com/turnstile/v0/siteverify', 'https://api.resend.com/emails',
    ...['accept_contact_request', 'claim_contact_notifications', 'finish_contact_notification'].map(n => `${config.url}/rest/v1/rpc/${n}`),
  ]);
  for (const field of ['name', 'company', 'message']) {
    for (const attack of attacks) {
      const s = stub();
      const payload = { ...sample(), [field]: attack, sql: attack, table: attack, query: attack };
      assert((await contactHandler(() => config, s.send)(req(payload))).status === 201);
      const write = s.calls.find(c => c.url.endsWith('accept_contact_request'))!;
      assert(write.body.p_request[field] === attack);
      assert(!('sql' in write.body.p_request) && !('table' in write.body.p_request) && !('query' in write.body.p_request));
      assert(s.calls.every(c => allowed.has(c.url)));
      const mail = s.calls.find(c => c.url === 'https://api.resend.com/emails')!;
      assert(mail.body.text.includes(attack) && !mail.body.html);
    }
  }
  const s = stub();
  const normal = { ...sample(), name: "Ana O'Connor", company: "L'Arquitectura", email: "'or'1'='1@example.com" };
  assert((await contactHandler(() => config, s.send)(req(normal))).status === 201);
  assert(s.saved().name === normal.name && s.saved().company === normal.company && s.saved().email === normal.email);
});

Deno.test('SQL expressions and object values cannot replace structured fields or the CAPTCHA', async () => {
  const attack = "' OR '1'='1' --";
  for (const field of ['request_id', 'email', 'phone', 'homes', 'stage', 'language', 'website']) {
    const s = stub();
    assert((await contactHandler(() => config, s.send)(req({ ...sample(), [field]: attack }))).status === 400, field);
    assert(s.calls.length === 0);
  }
  for (const field of Object.keys(sample())) {
    const s = stub();
    assert((await contactHandler(() => config, s.send)(req({ ...sample(), [field]: { sql: 'SELECT 1' } }))).status === 400, field);
    assert(s.calls.length === 0);
  }
  const s = stub({ captcha: { success: false } });
  assert((await contactHandler(() => config, s.send)(req({ ...sample(), token: attack }))).status === 400);
  assert(s.calls.length === 1 && s.calls[0].url.endsWith('siteverify'));
});
