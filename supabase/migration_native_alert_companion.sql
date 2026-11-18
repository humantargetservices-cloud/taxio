-- TAXIO native alert companion devices.
-- Server-owned only: clients register through /api/native-alert-device.
-- Existing PWA/Web Push tables and triggers are untouched.
create table if not exists public.company_native_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android','ios')),
  device_id text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_error text
);
create index if not exists company_native_devices_company_enabled_idx on public.company_native_devices(company_id,enabled);
create index if not exists company_native_devices_user_idx on public.company_native_devices(user_id);
alter table public.company_native_devices enable row level security;
revoke all on table public.company_native_devices from anon,authenticated;
