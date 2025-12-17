-- User profile table aligned with Supabase Auth users.
-- Run this in the Supabase SQL editor.

create table if not exists public.user_profiles (
  id uuid primary key, -- matches auth.users.id
  email text,
  alias text,
  avatar_type text default 'identicon',
  avatar_seed text,
  theme_preference text default 'system',
  updated_at timestamptz not null default now()
);

-- Keep email in sync if you want to denormalize (optional).
create or replace view public.user_profiles_with_email as
select
  p.*,
  u.email as auth_email
from public.user_profiles p
left join auth.users u on u.id = p.id;

-- Enable RLS and policies: users can read/update only their own row.
alter table public.user_profiles enable row level security;

create policy "Users can select their profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Users can insert their profile" on public.user_profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their profile" on public.user_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
