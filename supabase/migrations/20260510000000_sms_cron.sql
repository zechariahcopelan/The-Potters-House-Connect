-- Fire the process-scheduled endpoint every minute via pg_cron + pg_net.
-- The endpoint is idempotent: it only acts on rows with status = 'pending'
-- whose send_at timestamp is in the past.
select cron.schedule(
  'process-scheduled-sms',
  '* * * * *',
  $$
  select net.http_post(
    url    := 'https://tanstack-start-app.potters-house-mn.workers.dev/api/public/process-scheduled',
    body   := '{}'::jsonb
  )
  $$
);
