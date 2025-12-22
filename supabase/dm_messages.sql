-- Direct message tables + RLS policies
create extension if not exists "pgcrypto";

create table if not exists public.dm_channels (
  id text primary key,
  participant_ids uuid[] not null,
  participant_labels text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_text text,
  last_message_at timestamptz,
  last_message_author_id uuid,
  last_message_author_label text,
  constraint dm_channels_participants_len check (array_length(participant_ids, 1) = 2),
  constraint dm_channels_labels_len check (array_length(participant_labels, 1) = 2)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id text not null references public.dm_channels(id) on delete cascade,
  author_id uuid not null,
  author_label text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists dm_channels_participant_ids_gin
  on public.dm_channels using gin (participant_ids);

create index if not exists dm_channels_last_message_at_idx
  on public.dm_channels (last_message_at desc, updated_at desc);

create index if not exists dm_messages_channel_id_created_at_idx
  on public.dm_messages (channel_id, created_at);

alter table public.dm_channels enable row level security;
alter table public.dm_messages enable row level security;

create policy "DM channels are visible to participants" on public.dm_channels
  for select using (auth.uid() = any(participant_ids));

create policy "DM channels insert for participants" on public.dm_channels
  for insert with check (auth.uid() = any(participant_ids));

create policy "DM channels update for participants" on public.dm_channels
  for update using (auth.uid() = any(participant_ids));

create policy "DM messages are visible to participants" on public.dm_messages
  for select using (
    exists (
      select 1
      from public.dm_channels c
      where c.id = dm_messages.channel_id
        and auth.uid() = any(c.participant_ids)
    )
  );

create policy "DM messages insert by author participant" on public.dm_messages
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1
      from public.dm_channels c
      where c.id = dm_messages.channel_id
        and auth.uid() = any(c.participant_ids)
    )
  );

create or replace function public.update_dm_channel_last_message()
returns trigger as $$
begin
  update public.dm_channels
  set
    last_message_text = new.content,
    last_message_at = new.created_at,
    last_message_author_id = new.author_id,
    last_message_author_label = new.author_label,
    updated_at = new.created_at
  where id = new.channel_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists dm_messages_update_channel on public.dm_messages;
create trigger dm_messages_update_channel
  after insert on public.dm_messages
  for each row execute function public.update_dm_channel_last_message();
