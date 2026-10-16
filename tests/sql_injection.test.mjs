import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const migration = await readFile(new URL('../supabase/migrations/20261016071638_contact_requests.sql', import.meta.url), 'utf8');
const attacks = ["' OR '1'='1' --", "'; DROP TABLE sqli_probe; --", "'; UPDATE sqli_probe SET v='x'; --", "x'); SELECT pg_sleep(0.05); --", "$$; SELECT current_user; --", "' UNION SELECT 'intrusion' --"];
const sample = () => ({ request_id: crypto.randomUUID(), name: "Ana O'Connor", company: "L'Arquitectura", email: 'qa@example.com', phone: '+34 600000000', homes: 24, stage: 'En planificación', message: 'Test', language: 'es' });
async function setup() {
  const db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to service_role;');
  await db.exec(migration);
  // This disposable sentinel would expose execution of a concatenated SQL payload.
  await db.exec("create table public.sqli_probe(v text); insert into public.sqli_probe values ('unchanged'); grant all on public.sqli_probe to service_role; set role service_role;");
  return db;
}
async function accept(db, value, emailHash, payloadHash = 'b'.repeat(64)) {
  return (await db.query('select public.accept_contact_request($1::jsonb, $2, $3) as result', [JSON.stringify(value), emailHash, payloadHash])).rows[0].result;
}
async function sentinel(db) {
  assert.deepEqual((await db.query('select * from public.sqli_probe')).rows, [{ v: 'unchanged' }]);
}

test('SQL payloads in every text column remain literal through insert, claim and notification completion', async () => {
  const db = await setup();
  try {
    let count = 0;
    for (const field of ['name', 'company', 'email', 'phone', 'message']) {
      for (const attack of attacks) {
        const value = { ...sample(), [field]: attack };
        const hash = (++count).toString(16).padStart(64, '0');
        assert.equal((await accept(db, value, hash)).id, value.request_id);
        const stored = (await db.query('select * from public.contact_requests where id = $1', [value.request_id])).rows[0];
        assert.equal(stored[field], attack);
        const job = (await db.query('select * from public.claim_contact_notifications($1)', [value.request_id])).rows[0];
        assert.equal(job[field], attack);
        assert.equal((await db.query('select public.finish_contact_notification($1, $2, $3, $4) as ok', [job.id, job.notification_lease, attack, attack])).rows[0].ok, true);
        const finished = (await db.query('select * from public.contact_requests where id = $1', [job.id])).rows[0];
        assert.equal(finished.notification_provider_id, attack);
        assert.equal(finished.notification_error, attack);
        await sentinel(db);
        assert.equal((await db.query('select count(*)::int as n from public.contact_requests')).rows[0].n, count);
      }
    }
    const normal = sample();
    await accept(db, normal, 'c'.repeat(64));
    const stored = (await db.query('select name, company from public.contact_requests where id = $1', [normal.request_id])).rows[0];
    assert.deepEqual(stored, { name: normal.name, company: normal.company });
  } finally { await db.close(); }
});

test('typed identifiers, numbers, enumerations and hashes reject SQL expressions without partial writes', async () => {
  const db = await setup();
  try {
    for (const field of ['request_id', 'homes', 'stage', 'language']) {
      for (const attack of attacks) {
        await assert.rejects(accept(db, { ...sample(), [field]: attack }, 'a'.repeat(64)), /invalid input syntax|check constraint/);
      }
    }
    for (const attack of attacks) {
      await assert.rejects(accept(db, sample(), attack), /invalid_hash/);
      await assert.rejects(accept(db, sample(), 'a'.repeat(64), attack), /invalid_hash/);
      await assert.rejects(db.query('select * from public.claim_contact_notifications($1)', [attack]), /invalid input syntax/);
      await assert.rejects(db.query('select public.finish_contact_notification($1, $2, $3, $4)', [attack, crypto.randomUUID(), null, null]), /invalid input syntax/);
      await assert.rejects(db.query('select public.finish_contact_notification($1, $2, $3, $4)', [crypto.randomUUID(), attack, null, null]), /invalid input syntax/);
    }
    assert.equal((await db.query('select count(*)::int as n from public.contact_requests')).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from public.contact_rate_limits')).rows[0].n, 0);
    await sentinel(db);
  } finally { await db.close(); }
});
