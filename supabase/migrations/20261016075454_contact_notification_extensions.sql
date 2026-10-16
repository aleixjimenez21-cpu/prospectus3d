-- Required by the private notification retry job; no job or credentials are created here.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
