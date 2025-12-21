-- Allow anyone to read messages
create policy "Messages are public read" on public.messages
  for select using (true);

-- Allow anyone to insert messages (for anonymous users)
create policy "Anyone can insert messages" on public.messages
  for insert with check (true);

-- Or if you want to restrict to authenticated users only:
-- create policy "Authenticated users can insert" on public.messages
--   for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');
