-- 입시플래너 Supabase schema
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('student', 'counselor')),
  grade_level text,
  class_name text,
  high_school text,
  preferred_major text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_profiles (
  student_id uuid primary key references public.app_users(id) on delete cascade,
  targets jsonb not null default '[]'::jsonb,
  grades jsonb not null default '{}'::jsonb,
  gibpu jsonb,
  fname text not null default '',
  essays jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '{}'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consultation_requests (
  id text primary key,
  student_id uuid not null references public.app_users(id) on delete cascade,
  category text not null,
  preferred_date date,
  preferred_time text,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  email_sent_at timestamptz
);

create table if not exists public.counseling_journals (
  id text primary key,
  student_id uuid not null references public.app_users(id) on delete cascade,
  student_name text not null default '',
  counselor_id uuid not null references public.app_users(id) on delete cascade,
  counselor_name text not null default '',
  date date not null default current_date,
  topic text not null default '상담 기록',
  summary text not null default '',
  next_steps text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_app_users_updated_at on public.app_users;
create trigger touch_app_users_updated_at
before update on public.app_users
for each row execute function public.touch_updated_at();

drop trigger if exists touch_student_profiles_updated_at on public.student_profiles;
create trigger touch_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
begin
  insert into public.app_users (
    id,
    email,
    name,
    role,
    grade_level,
    class_name,
    high_school,
    preferred_major
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    case when user_role in ('student', 'counselor') then user_role else 'student' end,
    new.raw_user_meta_data->>'grade_level',
    new.raw_user_meta_data->>'class_name',
    new.raw_user_meta_data->>'high_school',
    new.raw_user_meta_data->>'preferred_major'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    grade_level = excluded.grade_level,
    class_name = excluded.class_name,
    high_school = excluded.high_school,
    preferred_major = excluded.preferred_major;

  if user_role = 'student' then
    insert into public.student_profiles (student_id)
    values (new.id)
    on conflict (student_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_counselor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where id = auth.uid()
      and role = 'counselor'
  );
$$;

alter table public.app_users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.counseling_journals enable row level security;

drop policy if exists "app_users_select_own_or_counselor" on public.app_users;
create policy "app_users_select_own_or_counselor"
on public.app_users
for select
to authenticated
using (id = auth.uid() or public.is_counselor());

drop policy if exists "app_users_update_own" on public.app_users;
create policy "app_users_update_own"
on public.app_users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "student_profiles_select_own_or_counselor" on public.student_profiles;
create policy "student_profiles_select_own_or_counselor"
on public.student_profiles
for select
to authenticated
using (student_id = auth.uid() or public.is_counselor());

drop policy if exists "student_profiles_upsert_own_or_counselor" on public.student_profiles;
create policy "student_profiles_upsert_own_or_counselor"
on public.student_profiles
for all
to authenticated
using (student_id = auth.uid() or public.is_counselor())
with check (student_id = auth.uid() or public.is_counselor());

drop policy if exists "requests_select_own_or_counselor" on public.consultation_requests;
create policy "requests_select_own_or_counselor"
on public.consultation_requests
for select
to authenticated
using (student_id = auth.uid() or public.is_counselor());

drop policy if exists "requests_insert_student_own" on public.consultation_requests;
create policy "requests_insert_student_own"
on public.consultation_requests
for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "requests_update_own_or_counselor" on public.consultation_requests;
create policy "requests_update_own_or_counselor"
on public.consultation_requests
for update
to authenticated
using (student_id = auth.uid() or public.is_counselor())
with check (student_id = auth.uid() or public.is_counselor());

drop policy if exists "journals_select_student_or_counselor" on public.counseling_journals;
create policy "journals_select_student_or_counselor"
on public.counseling_journals
for select
to authenticated
using (student_id = auth.uid() or public.is_counselor());

drop policy if exists "journals_manage_counselor" on public.counseling_journals;
create policy "journals_manage_counselor"
on public.counseling_journals
for all
to authenticated
using (public.is_counselor())
with check (public.is_counselor());

create index if not exists app_users_role_idx on public.app_users(role);
create index if not exists app_users_school_idx on public.app_users(high_school, grade_level, class_name);
create index if not exists requests_student_status_idx on public.consultation_requests(student_id, status);
create index if not exists journals_student_date_idx on public.counseling_journals(student_id, date desc);
