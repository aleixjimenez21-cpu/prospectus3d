-- Only server-side service_role can access requests, counters and queue RPCs.
create table public.contact_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 2 and 150),
  company text not null check (length(company) between 2 and 150),
  email text not null check (length(email) between 3 and 200),
  phone text not null check (length(phone) between 7 and 40),
  homes integer not null check (homes between 1 and 100000),
  stage text not null check (stage in ('En planificación', 'En preventa', 'En construcción', 'Terminada', 'Otro / por definir')),
  message text not null default '' check (length(message) <= 2000),
  language text not null check (language in ('es', 'en', 'it')),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  privacy_version text not null default '2026-10-16',
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sending', 'sent', 'needs_attention')),
  notification_attempts integer not null default 0,
  notification_next_at timestamptz not null default now(),
  notification_lease uuid,
  notification_locked_until timestamptz,
  notification_provider_id text,
  notification_sent_at timestamptz,
  notification_error text
);
create table public.contact_rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null check (count > 0),
  primary key (bucket, window_start)
);
create index contact_notification_queue_idx on public.contact_requests (notification_next_at, created_at)
  where notification_status in ('pending', 'sending');
alter table public.contact_requests enable row level security;
alter table public.contact_rate_limits enable row level security;
revoke all on public.contact_requests, public.contact_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.contact_requests, public.contact_rate_limits to service_role;

-- The request, rate counters and notification queue commit in one transaction.
create function public.accept_contact_request(p_request jsonb, p_email_hash text, p_payload_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  request_id uuid := (p_request->>'request_id')::uuid;
  existing_hash text;
  counter integer;
  period timestamptz := date_trunc('hour', now());
begin
  if p_email_hash !~ '^[a-f0-9]{64}$' or p_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_hash';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(request_id::text, 0));
  select payload_hash into existing_hash from public.contact_requests where id = request_id;
  if found then
    if existing_hash <> p_payload_hash then raise exception 'idempotency_conflict'; end if;
    return jsonb_build_object('id', request_id, 'duplicate', true);
  end if;
  -- Always acquire the global counter before the email counter to avoid deadlocks.
  insert into public.contact_rate_limits values ('global', period, 1)
    on conflict (bucket, window_start) do update set count = public.contact_rate_limits.count + 1
    returning count into counter;
  if counter > 100 then raise exception 'rate_limited'; end if;
  insert into public.contact_rate_limits values ('email:' || p_email_hash, period, 1)
    on conflict (bucket, window_start) do update set count = public.contact_rate_limits.count + 1
    returning count into counter;
  if counter > 3 then raise exception 'rate_limited'; end if;
  insert into public.contact_requests (id, name, company, email, phone, homes, stage, message, language, payload_hash)
    values (request_id, p_request->>'name', p_request->>'company', p_request->>'email', p_request->>'phone',
      (p_request->>'homes')::integer, p_request->>'stage', p_request->>'message', p_request->>'language', p_payload_hash);
  delete from public.contact_rate_limits where window_start < now() - interval '2 days';
  return jsonb_build_object('id', request_id, 'duplicate', false);
end $$;

create function public.claim_contact_notifications(p_id uuid default null)
returns setof public.contact_requests language plpgsql security invoker set search_path = '' as $$
begin
  -- Resend keeps idempotency keys for 24h. Stop automatic attempts before expiry.
  update public.contact_requests set notification_status = 'needs_attention', notification_error = 'retry_window_expired'
    where notification_status in ('pending', 'sending')
      and (created_at <= now() - interval '23 hours' or notification_attempts >= 8)
      and (notification_locked_until is null or notification_locked_until < now());
  return query
    with candidates as (
      select id from public.contact_requests
      where notification_status in ('pending', 'sending')
        and notification_next_at <= now()
        and (notification_locked_until is null or notification_locked_until < now())
        and (p_id is null or id = p_id)
      order by notification_next_at, created_at limit 5 for update skip locked
    )
    update public.contact_requests r set notification_status = 'sending',
      notification_attempts = r.notification_attempts + 1, notification_lease = gen_random_uuid(),
      notification_locked_until = now() + interval '2 minutes'
    from candidates c where r.id = c.id returning r.*;
end $$;

create function public.finish_contact_notification(p_id uuid, p_lease uuid, p_provider_id text, p_error text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.contact_requests set
    notification_status = case when p_provider_id is not null then 'sent'
      when notification_attempts >= 8 then 'needs_attention' else 'pending' end,
    notification_provider_id = p_provider_id,
    notification_sent_at = case when p_provider_id is not null then now() else null end,
    notification_error = left(p_error, 100), notification_locked_until = null, notification_lease = null,
    notification_next_at = now() + make_interval(secs => least(3600, (60 * power(2, notification_attempts))::integer))
  where id = p_id and notification_lease = p_lease and notification_status = 'sending';
  return found;
end $$;
revoke all on function public.accept_contact_request(jsonb, text, text),
  public.claim_contact_notifications(uuid), public.finish_contact_notification(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.accept_contact_request(jsonb, text, text),
  public.claim_contact_notifications(uuid), public.finish_contact_notification(uuid, uuid, text, text)
  to service_role;
