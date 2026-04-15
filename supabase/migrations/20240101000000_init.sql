-- ============================================================
-- Presentation Remote – Supabase schema + RLS
-- ============================================================

-- 1. decks -------------------------------------------------
create table if not exists public.decks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  storage_path  text not null,
  slide_count   int  not null default 20,
  created_at    timestamptz not null default now()
);

alter table public.decks enable row level security;

create policy "Users can view own decks"
  on public.decks for select
  using (auth.uid() = user_id);

create policy "Users can insert own decks"
  on public.decks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own decks"
  on public.decks for update
  using (auth.uid() = user_id);

create policy "Users can delete own decks"
  on public.decks for delete
  using (auth.uid() = user_id);

-- 2. sessions ----------------------------------------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  deck_id       uuid not null references public.decks(id) on delete cascade,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can create own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- 3. commands (audit log, optional) -------------------------
create table if not exists public.commands (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  command_type  text not null,
  payload       jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.commands enable row level security;

create policy "Users can view own commands"
  on public.commands for select
  using (auth.uid() = user_id);

create policy "Users can insert own commands"
  on public.commands for insert
  with check (auth.uid() = user_id);

-- 4. Storage bucket ----------------------------------------
-- Run via Supabase Dashboard or SQL:
insert into storage.buckets (id, name, public)
values ('decks', 'decks', false)
on conflict (id) do nothing;

-- Storage RLS
create policy "Authenticated users can upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'decks'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own files"
  on storage.objects for select
  using (
    bucket_id = 'decks'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'decks'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
