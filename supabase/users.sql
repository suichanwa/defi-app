create table if not exists public.user_profiles (
  id text primary key, -- auth.users.id (uuid as text) or anon_* id
  email text,
  alias text,
  avatar_type text default 'identicon',
  avatar_url text,
  avatar_seed text,
  theme_preference text default 'system',
  language text default 'en',
  evm_wallet_address text,
  solana_wallet_address text,
  xmtp_inbox_id text,
  updated_at timestamptz not null default now()
);

-- Keep email in sync if you want to denormalize (optional).
create or replace view public.user_profiles_with_email as
select
  p.*,
  u.email as auth_email
from public.user_profiles p
left join auth.users u on u.id::text = p.id;

-- Enable RLS and policies: public read, signed-in users update their row,
-- anonymous profiles allowed for anon_* ids.
alter table public.user_profiles enable row level security;

create policy "Profiles are public read" on public.user_profiles
  for select using (true);

create policy "Signed-in profile insert" on public.user_profiles
  for insert with check (auth.uid()::text = id);

create policy "Signed-in profile update" on public.user_profiles
  for update using (auth.uid()::text = id) with check (auth.uid()::text = id);

create policy "Anonymous profile insert" on public.user_profiles
  for insert with check (auth.uid() is null and id like 'anon_%');

create policy "Anonymous profile update" on public.user_profiles
  for update using (auth.uid() is null and id like 'anon_%')
  with check (auth.uid() is null and id like 'anon_%');
