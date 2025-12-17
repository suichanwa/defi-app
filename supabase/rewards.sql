/*
supabase/rewards.sql
PostgreSQL SQL

Enable UUID generation for activity IDs.
create extension if not exists "pgcrypto";

Stores a user's current rewards summary.
create table if not exists public.rewards_summary (
  user_id text primary key,
  points integer not null default 0,
  tier text not null default 'bronze',
  updated_at timestamptz not null default now()
);

Stores recent reward activity events.
create table if not exists public.rewards_activity (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text not null,
  points_delta integer not null,
  timestamp timestamptz not null default now()
);

Speed up recent activity lookups per user.
create index if not exists rewards_activity_user_id_idx on public.rewards_activity (user_id);

Enable RLS so access can be controlled via policies.
alter table public.rewards_summary enable row level security;
alter table public.rewards_activity enable row level security;

Allow public read access (tighten later with auth-based policies).
create policy "Rewards summary read" on public.rewards_summary
  for select
  using (true);

Allow public read access (tighten later with auth-based policies).
create policy "Rewards activity read" on public.rewards_activity
  for select
  using (true);
*/
