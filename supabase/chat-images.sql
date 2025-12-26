-- Create private storage bucket for chat images.
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do update set public = false;

-- Allow read access to signed URLs for authenticated and anon users.
create policy "Chat images read"
on storage.objects
for select
to authenticated, anon
using (bucket_id = 'chat-images');

-- Allow uploads to the chat-images bucket for authenticated and anon users.
create policy "Chat images upload"
on storage.objects
for insert
to authenticated, anon
with check (bucket_id = 'chat-images');

-- Add columns to store image metadata in chat tables.
alter table messages add column if not exists image_path text;
alter table messages add column if not exists message_type text;

alter table dm_messages add column if not exists image_path text;
alter table dm_messages add column if not exists message_type text;
