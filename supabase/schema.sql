-- Run in Supabase SQL Editor, in a NEW project dedicated to Jessica Daily.
-- The table stores one JSON snapshot per authenticated user.
create table if not exists public.jessica_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.jessica_snapshots enable row level security;
revoke all on public.jessica_snapshots from anon;
grant select, insert, update on public.jessica_snapshots to authenticated;
drop policy if exists "owner_read" on public.jessica_snapshots;
drop policy if exists "owner_insert" on public.jessica_snapshots;
drop policy if exists "owner_update" on public.jessica_snapshots;
create policy "owner_read" on public.jessica_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "owner_insert" on public.jessica_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owner_update" on public.jessica_snapshots
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- IMPORTANT: Never put the Supabase service_role key in Vercel's public config,
-- browser JavaScript, or GitHub. Use the anon/publishable key with RLS above.
