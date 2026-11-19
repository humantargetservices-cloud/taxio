-- Android TAXIO watch service fallback.
-- Removes Firebase/Expo server credentials from the critical Android alert path.
alter table public.company_native_devices
  add column if not exists watch_token_hash text,
  add column if not exists test_alert_until timestamptz;

create unique index if not exists company_native_devices_watch_token_hash_uq
  on public.company_native_devices (watch_token_hash)
  where watch_token_hash is not null;
