export const RECIPIENT = 'prospectus3d.es@gmail.com';
const STAGES = ['En planificación', 'En preventa', 'En construcción', 'Terminada', 'Otro / por definir'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT = 16_384;
export type Config = { url: string; key: string; resend: string; from: string; turnstile: string; hash: string; worker: string; origins: string[] };
export type Fetcher = typeof fetch;
export type Lead = { request_id: string; name: string; company: string; email: string; phone: string; homes: number; stage: string; message: string; language: string };
type Job = Lead & { id: string; notification_lease: string };
class Failure extends Error {
  constructor(readonly code: string, readonly status = 503) { super(code); }
}
export function configuration(env: (key: string) => string | undefined): Config {
  let key = env('SUPABASE_SERVICE_ROLE_KEY') || '';
  try { key = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}').default || key; } catch { /* invalid config fails closed */ }
  const c = {
    url: env('SUPABASE_URL') || '', key, resend: env('RESEND_API_KEY') || '',
    from: env('CONTACT_EMAIL_FROM') || '', turnstile: env('TURNSTILE_SECRET_KEY') || '',
    hash: env('CONTACT_HASH_SECRET') || '', worker: env('CONTACT_WORKER_SECRET') || '',
    origins: (env('CONTACT_ALLOWED_ORIGINS') || 'https://prospectus3d.com,https://www.prospectus3d.com').split(',').map(s => s.trim()),
  };
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(c.url) || !c.key || !c.resend || !c.turnstile ||
    !/^[a-z0-9._+-]+@(?:[a-z0-9-]+\.)*prospectus3d\.com$/i.test(c.from) || c.hash.length < 32 || c.worker.length < 32 ||
    !c.origins.length || c.origins.some(o => !/^https:\/\/(www\.)?prospectus3d\.com$/.test(o))) {
    throw new Failure('not_configured');
  }
  return c;
}
function response(status: number, data: unknown, origin?: string): Response {
  return Response.json(data, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    ...(status === 429 ? { 'Retry-After': '3600' } : {}),
  } });
}
async function body(req: Request): Promise<Record<string, unknown>> {
  if (req.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Failure('invalid_content_type', 415);
  if (Number(req.headers.get('content-length')) > LIMIT) throw new Failure('body_too_large', 413);
  const reader = req.body?.getReader();
  if (!reader) throw new Failure('invalid_body', 400);
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > LIMIT) { await reader.cancel(); throw new Failure('body_too_large', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0;
    return value;
  } catch { throw new Failure('invalid_body', 400); }
}
export function validate(data: Record<string, unknown>): { lead: Lead; token: string } {
  function field(key: string, min: number, max: number, multiline = false): string {
    const value = data[key];
    if (typeof value !== 'string') throw new Failure('invalid_fields', 400);
    const clean = value.trim();
    if (clean.length < min || clean.length > max || (multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(clean)) throw new Failure('invalid_fields', 400);
    return clean;
  }
  if (data.website !== '' && data.website !== undefined) throw new Failure('invalid_fields', 400);
  const lead: Lead = {
    request_id: field('request_id', 36, 36), name: field('name', 2, 150), company: field('company', 2, 150),
    email: field('email', 3, 200).toLowerCase(), phone: field('phone', 7, 40),
    homes: data.homes as number, stage: field('stage', 1, 40), message: field('message', 0, 2000, true), language: field('language', 2, 2),
  };
  if (!UUID.test(lead.request_id) || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(lead.email) ||
    !/^[+\d ().-]+$/.test(lead.phone) || lead.phone.replace(/\D/g, '').length < 7 ||
    !Number.isInteger(lead.homes) || lead.homes < 1 || lead.homes > 100000 || !STAGES.includes(lead.stage) || !['es', 'en', 'it'].includes(lead.language)) {
    throw new Failure('invalid_fields', 400);
  }
  return { lead, token: field('token', 1, 2048) };
}
async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
async function rpc(c: Config, send: Fetcher, name: string, data: unknown): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: c.key };
  // Modern secret keys belong only in apikey; legacy service_role JWTs also use Bearer.
  if (c.key.startsWith('eyJ')) headers.Authorization = `Bearer ${c.key}`;
  const res = await send(`${c.url}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(data), signal: AbortSignal.timeout(8000) });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (result.message === 'rate_limited') throw new Failure('rate_limited', 429);
    if (result.message === 'idempotency_conflict') throw new Failure('idempotency_conflict', 409);
    throw new Failure('storage_unavailable');
  }
  return result;
}
export async function deliver(c: Config, send: Fetcher, id: string | null): Promise<void> {
  const jobs = await rpc(c, send, 'claim_contact_notifications', { p_id: id }) as Job[];
  for (const job of jobs) {
    let providerId: string | null = null;
    let error: string | null = null;
    try {
      const result = await send('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(8000), headers: {
        Authorization: `Bearer ${c.resend}`, 'Content-Type': 'application/json', 'Idempotency-Key': `prospectus-contact/${job.id}`,
      }, body: JSON.stringify({
        from: `Prospectus 3D <${c.from}>`, to: [RECIPIENT], reply_to: job.email,
        subject: 'Nueva solicitud de demo · Prospectus 3D',
        text: `Solicitud: ${job.id}\nNombre: ${job.name}\nEmpresa: ${job.company}\nEmail: ${job.email}\nTeléfono: ${job.phone}\nViviendas: ${job.homes}\nEstado: ${job.stage}\nIdioma: ${job.language}\n\nInformación adicional:\n${job.message || 'No indicada'}`,
      }) });
      const data = await result.json().catch(() => ({}));
      if (result.ok && typeof data.id === 'string') providerId = data.id;
      else error = `email_http_${result.status}`;
    } catch { error = 'email_network_error'; }
    // If finalisation fails, the lease expires and the same provider idempotency key is retried.
    await rpc(c, send, 'finish_contact_notification', { p_id: job.id, p_lease: job.notification_lease, p_provider_id: providerId, p_error: error });
  }
}
export function contactHandler(getConfig: () => Config, send: Fetcher = fetch) {
  return async (req: Request): Promise<Response> => {
    let origin: string | undefined;
    try {
      const c = getConfig();
      const suppliedOrigin = req.headers.get('origin');
      if (!suppliedOrigin || !c.origins.includes(suppliedOrigin)) return response(403, { error: 'origin_not_allowed' });
      origin = suppliedOrigin;
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', 'Vary': 'Origin',
      } });
      if (req.method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);
      const { lead, token } = validate(await body(req));
      const check = await send('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ secret: c.turnstile, response: token }),
      });
      const verified = await check.json();
      if (!check.ok) throw new Failure('verification_unavailable');
      if (verified.success !== true || verified.hostname !== new URL(origin).hostname || verified.action !== 'contact') throw new Failure('verification_failed', 400);
      const result = await rpc(c, send, 'accept_contact_request', {
        p_request: lead, p_email_hash: await hmac(lead.email, c.hash), p_payload_hash: await hmac(JSON.stringify(lead), c.hash),
      }) as { id: string };
      if (result.id !== lead.request_id) throw new Failure('storage_unavailable');
      // Success means durably stored. Notification is independently retried by the scheduled worker.
      try { await deliver(c, send, result.id); } catch { /* Durable queue retains unsent notifications. */ }
      return response(201, { ok: true, request_id: result.id }, origin);
    } catch (error) {
      const failure = error instanceof Failure ? error : new Failure('service_unavailable');
      return response(failure.status, { error: failure.code }, origin);
    }
  };
}
export function notificationHandler(getConfig: () => Config, send: Fetcher = fetch) {
  return async (req: Request): Promise<Response> => {
    try {
      if (req.method !== 'POST') return response(405, { error: 'method_not_allowed' });
      const c = getConfig();
      const auth = req.headers.get('authorization') || '';
      // Hash first so comparison does not expose the secret length or matching prefix.
      if (await hmac(auth, c.hash) !== await hmac(`Bearer ${c.worker}`, c.hash)) return response(401, { error: 'unauthorized' });
      await deliver(c, send, null);
      return response(200, { ok: true });
    } catch { return response(503, { error: 'notification_unavailable' }); }
  };
}
