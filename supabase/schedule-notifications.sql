-- Run after enabling pg_cron + pg_net in the Supabase dashboard and adding two Vault secrets:
-- prospectus_contact_worker_url: https://PROJECT.supabase.co/functions/v1/contact-notifications
-- prospectus_contact_worker_secret: same value as CONTACT_WORKER_SECRET in Edge Function Secrets.
-- No secret is stored in Git or in the visible cron command.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'prospectus_contact_worker_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'prospectus_contact_worker_secret') then
    raise exception 'Configure both Prospectus Vault secrets before scheduling';
  end if;
end $$;
select cron.schedule('prospectus-contact-notifications', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'prospectus_contact_worker_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'prospectus_contact_worker_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 100000
  );
$job$);
