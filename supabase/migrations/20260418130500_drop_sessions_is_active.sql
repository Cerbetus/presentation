-- Remove unused field from sessions.
alter table public.sessions
  drop column if exists is_active;

