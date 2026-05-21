-- Student profile notes for counselor-managed per-student memos.
-- Supabase Dashboard > SQL Editor 에 붙여넣고 Run 하세요.

alter table public.student_profiles
  add column if not exists notes jsonb not null default '{}'::jsonb;
