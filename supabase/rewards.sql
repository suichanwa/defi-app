create extension if not exists "pgcrypto";

create table if not exists public.rewards_summary (
  user_id text primary key,
  points integer not null default 0,
  tier text not null default 'bronze',
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards_activity (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text not null,
  points_delta integer not null,
  timestamp timestamptz not null default now()
);

create index if not exists rewards_activity_user_id_idx on public.rewards_activity (user_id);

alter table public.rewards_summary enable row level security;
alter table public.rewards_activity enable row level security;

create policy "Rewards summary read" on public.rewards_summary
  for select
  using (true);

create policy "Rewards activity read" on public.rewards_activity
  for select
  using (true);
