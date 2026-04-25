alter table public.user_profiles
  add column if not exists evm_wallet_address text;

alter table public.user_profiles
  add column if not exists solana_wallet_address text;

alter table public.user_profiles
  add column if not exists xmtp_inbox_id text;

create index if not exists user_profiles_evm_wallet_address_idx
  on public.user_profiles (evm_wallet_address);

create index if not exists user_profiles_solana_wallet_address_idx
  on public.user_profiles (solana_wallet_address);
