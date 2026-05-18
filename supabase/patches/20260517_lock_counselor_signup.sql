-- Run this once if you already ran supabase/schema.sql before May 17.
-- Counselor signup is locked behind this invite code.
-- Change the value below in Supabase if you want a different code:
-- update public.app_settings set value = 'your-new-code' where key = 'counselor_invite_code';

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('counselor_invite_code', 'topclass-counselor-2026')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  invite_code text := nullif(new.raw_user_meta_data->>'counselor_invite_code', '');
  stored_invite_code text;
  user_role text := 'student';
begin
  select value
    into stored_invite_code
    from public.app_settings
   where key = 'counselor_invite_code';

  if requested_role = 'counselor'
     and invite_code is not null
     and stored_invite_code is not null
     and invite_code = stored_invite_code then
    user_role := 'counselor';
  end if;

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
    user_role,
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

drop policy if exists "app_users_update_own" on public.app_users;
create policy "app_users_update_own"
on public.app_users
for update
to authenticated
using (id = auth.uid() or public.is_counselor())
with check (id = auth.uid() or public.is_counselor());
