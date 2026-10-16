import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const migration = await readFile(new URL('../supabase/migrations/20261016071638_contact_requests.sql', import.meta.url), 'utf8');
const sample = () => ({ request_id: crypto.randomUUID(), name: 'Prueba Técnica', company: 'Empresa de prueba', email: 'qa@example.com', phone: '+34 600000000', homes: 24, stage: 'En planificación', message: 'Test', language: 'es' });
const hash = 'a'.repeat(64), fingerprint = 'b'.repeat(64);
async function accept(db, value, contentHash = fingerprint) {
  return (await db.query('select public.accept_contact_request($1::jsonb, $2, $3) as result', [JSON.stringify(value), hash, contentHash])).rows[0].result;
}
const claim = async db => (await db.query('select * from public.claim_contact_notifications()')).rows;
const finish = async (db, row, provider = null, lease = row.notification_lease) => (await db.query('select public.finish_contact_notification($1, $2, $3, $4) as ok', [row.id, lease, provider, provider ? null : 'email_http_503'])).rows[0].ok;

test('migration, private data access, atomic limits, idempotency and durable email queue', async () => {
  const dir = await mkdtemp(join(process.cwd(), '.test-db-'));
  let db = new PGlite(dir);
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;');
    await db.exec(migration);
    const security = (await db.query("select relname, relrowsecurity from pg_class where relname in ('contact_requests', 'contact_rate_limits')")).rows;
    assert.equal(security.length, 2); assert(security.every(r => r.relrowsecurity));
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.contact_requests'), /permission denied/);
      await assert.rejects(db.query('insert into public.contact_rate_limits values (\'forged\', now(), 1)'), /permission denied/);
      await assert.rejects(accept(db, sample()), /permission denied/);
      await assert.rejects(claim(db), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const first = sample();
    assert.equal((await accept(db, first)).duplicate, false);
    assert.equal((await accept(db, first)).duplicate, true);
    await assert.rejects(accept(db, first, 'c'.repeat(64)), /idempotency_conflict/);
    await accept(db, sample()); await accept(db, sample());
    await assert.rejects(accept(db, sample()), /rate_limited/);
    assert.equal((await db.query('select count(*)::int as n from public.contact_requests')).rows[0].n, 3);
    assert((await db.query('select count from public.contact_rate_limits')).rows.every(r => r.count === 3));
    let jobs = await claim(db); assert.equal(jobs.length, 3); assert.equal((await claim(db)).length, 0);
    assert.equal(await finish(db, jobs[0], null, crypto.randomUUID()), false);
    assert.equal(await finish(db, jobs[0]), true);
    assert.equal((await claim(db)).length, 0, 'backoff prevents immediate retry');
    await db.query('update public.contact_requests set notification_next_at = now() where id = $1', [jobs[0].id]);
    const retry = (await claim(db))[0]; assert.equal(retry.notification_attempts, 2);
    assert.equal(await finish(db, retry, 'provider-id'), true);
    assert.equal((await claim(db)).length, 0, 'sent jobs are never reclaimed');
    const stalled = jobs[1];
    await db.query("update public.contact_requests set notification_locked_until = now() - interval '1 second' where id = $1", [stalled.id]);
    const recovered = (await claim(db))[0];
    assert.notEqual(recovered.notification_lease, stalled.notification_lease);
    assert.equal(await finish(db, stalled, 'stale-worker'), false, 'old worker cannot finish a new lease');
    await db.query("update public.contact_requests set created_at = now() - interval '24 hours', notification_locked_until = null where id = $1", [jobs[2].id]);
    assert.equal((await claim(db)).length, 0);
    assert.equal((await db.query('select notification_status from public.contact_requests where id = $1', [jobs[2].id])).rows[0].notification_status, 'needs_attention');
    // Close and reopen the actual PostgreSQL data directory, verifying persistence.
    await db.close(); db = new PGlite(dir);
    assert.equal((await db.query('select count(*)::int as n from public.contact_requests')).rows[0].n, 3);
    assert.equal((await db.query('select notification_provider_id from public.contact_requests where id = $1', [retry.id])).rows[0].notification_provider_id, 'provider-id');
  } finally { await db.close(); await rm(dir, { recursive: true, force: true }); }
});
