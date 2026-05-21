-- 입시플래너 Supabase schema
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run 하세요.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'student', 'counselor')),
  is_active boolean not null default true,
  grade_level text,
  class_name text,
  high_school text,
  phone text,
  preferred_major text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users add column if not exists is_active boolean not null default true;
alter table public.app_users add column if not exists phone text;
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check check (role in ('admin', 'student', 'counselor'));

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

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.counselor_classes (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  max_students integer not null default 100 check (max_students between 1 and 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.counselor_classes add column if not exists max_students integer not null default 100;
alter table public.counselor_classes add column if not exists is_active boolean not null default true;
alter table public.counselor_classes drop constraint if exists counselor_classes_max_students_check;
alter table public.counselor_classes add constraint counselor_classes_max_students_check check (max_students between 1 and 500);

create table if not exists public.class_memberships (
  student_id uuid primary key references public.app_users(id) on delete cascade,
  class_id uuid not null references public.counselor_classes(id) on delete cascade,
  joined_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('counselor_invite_code', 'topclass-counselor-2026')
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values ('admin_emails', '')
on conflict (key) do nothing;

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

drop trigger if exists touch_counselor_classes_updated_at on public.counselor_classes;
create trigger touch_counselor_classes_updated_at
before update on public.counselor_classes
for each row execute function public.touch_updated_at();

create or replace function public.normalize_class_code(code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  invite_code text := nullif(new.raw_user_meta_data->>'counselor_invite_code', '');
  class_invite_code text := public.normalize_class_code(new.raw_user_meta_data->>'class_invite_code');
  stored_invite_code text;
  admin_emails text := '';
  user_role text := 'student';
  matched_class public.counselor_classes;
  matched_count integer := 0;
begin
  select value
    into stored_invite_code
    from public.app_settings
   where key = 'counselor_invite_code';

  select coalesce(value, '')
    into admin_emails
    from public.app_settings
   where key = 'admin_emails';

  if exists (
    select 1
      from regexp_split_to_table(admin_emails, ',') as email(value)
     where lower(trim(email.value)) = lower(new.email)
  ) then
    user_role := 'admin';
  elsif requested_role = 'counselor' then
    if invite_code is not null
       and stored_invite_code is not null
       and invite_code = stored_invite_code then
      user_role := 'counselor';
    else
      raise exception '상담사 가입 코드가 올바르지 않습니다.';
    end if;
  end if;

  insert into public.app_users (
    id,
    email,
    name,
    role,
    is_active,
    grade_level,
    class_name,
    high_school,
    phone,
    preferred_major
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    user_role,
    true,
    new.raw_user_meta_data->>'grade_level',
    new.raw_user_meta_data->>'class_name',
    new.raw_user_meta_data->>'high_school',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'preferred_major'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    is_active = excluded.is_active,
    grade_level = excluded.grade_level,
    class_name = excluded.class_name,
    high_school = excluded.high_school,
    phone = excluded.phone,
    preferred_major = excluded.preferred_major;

  if user_role = 'student' then
    insert into public.student_profiles (student_id)
    values (new.id)
    on conflict (student_id) do nothing;

    if class_invite_code <> '' then
      select *
        into matched_class
        from public.counselor_classes
       where join_code = class_invite_code;

      if matched_class.id is null then
        raise exception '상담사 코드를 찾을 수 없습니다.';
      end if;

      if matched_class.is_active = false then
        raise exception '현재 비활성화된 상담사 코드입니다.';
      end if;

      if not exists (
        select 1
          from public.app_users
         where id = matched_class.counselor_id
           and role = 'counselor'
           and is_active = true
      ) then
        raise exception '현재 비활성화된 상담사 계정입니다.';
      end if;

      select count(*)
        into matched_count
        from public.class_memberships
       where class_id = matched_class.id;

      if matched_count >= matched_class.max_students then
        raise exception '이 상담사의 학생 정원이 가득 찼습니다.';
      end if;

      if matched_class.id is not null then
        insert into public.class_memberships (student_id, class_id)
        values (new.id, matched_class.id)
        on conflict (student_id) do update set
          class_id = excluded.class_id,
          joined_at = now();
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_auth_user_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
     set email = new.email,
         name = coalesce(nullif(new.raw_user_meta_data->>'name', ''), name, split_part(new.email, '@', 1)),
         phone = coalesce(nullif(new.raw_user_meta_data->>'phone', ''), phone),
         grade_level = coalesce(nullif(new.raw_user_meta_data->>'grade_level', ''), grade_level),
         high_school = coalesce(nullif(new.raw_user_meta_data->>'high_school', ''), high_school),
         preferred_major = coalesce(nullif(new.raw_user_meta_data->>'preferred_major', ''), preferred_major),
         updated_at = now()
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_auth_user_update();

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
      and is_active = true
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_counselor_for_student(target_student_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.class_memberships membership
      join public.counselor_classes counselor_class
        on counselor_class.id = membership.class_id
      join public.app_users counselor
        on counselor.id = counselor_class.counselor_id
     where membership.student_id = target_student_id
       and counselor_class.counselor_id = auth.uid()
       and counselor_class.is_active = true
       and counselor.is_active = true
  );
$$;

create or replace function public.is_class_owner(target_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.counselor_classes
     where id = target_class_id
       and counselor_id = auth.uid()
       and is_active = true
  );
$$;

create or replace function public.admin_upsert_counselor_access(
  target_counselor_id uuid,
  class_name text,
  requested_code text,
  student_limit integer,
  active boolean
)
returns public.counselor_classes
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := nullif(trim(class_name), '');
  clean_code text := public.normalize_class_code(requested_code);
  safe_limit integer := greatest(1, least(500, coalesce(student_limit, 100)));
  existing_class public.counselor_classes;
  saved_class public.counselor_classes;
begin
  if not public.is_admin() then
    raise exception '총관리자만 상담사 코드를 관리할 수 있습니다.';
  end if;

  if clean_name is null then
    raise exception '관리 이름을 입력해주세요.';
  end if;

  if clean_code = '' or length(clean_code) < 4 then
    raise exception '상담사 코드는 4자 이상이어야 합니다.';
  end if;

  if not exists (
    select 1
      from public.app_users
     where id = target_counselor_id
       and role = 'counselor'
  ) then
    raise exception '상담사 계정을 찾을 수 없습니다.';
  end if;

  if exists (
    select 1
      from public.counselor_classes
     where join_code = clean_code
       and counselor_id <> target_counselor_id
  ) then
    raise exception '이미 다른 상담사가 사용 중인 코드입니다.';
  end if;

  select *
    into existing_class
    from public.counselor_classes
   where counselor_id = target_counselor_id
   order by created_at asc
   limit 1;

  if existing_class.id is null then
    insert into public.counselor_classes (counselor_id, name, join_code, max_students, is_active)
    values (target_counselor_id, clean_name, clean_code, safe_limit, coalesce(active, true))
    returning * into saved_class;
  else
    update public.counselor_classes
       set name = clean_name,
           join_code = clean_code,
           max_students = safe_limit,
           is_active = coalesce(active, true)
     where id = existing_class.id
     returning * into saved_class;
  end if;

  update public.app_users
     set is_active = coalesce(active, true)
   where id = target_counselor_id;

  return saved_class;
end;
$$;

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  target_role text,
  active boolean default true
)
returns public.app_users
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_role text := lower(trim(target_role));
  saved_user public.app_users;
begin
  if not public.is_admin() then
    raise exception '총관리자만 가입자 역할을 변경할 수 있습니다.';
  end if;

  if clean_role not in ('student', 'counselor') then
    raise exception '학생 또는 상담사 역할만 선택할 수 있습니다.';
  end if;

  if not exists (select 1 from public.app_users where id = target_user_id) then
    raise exception '가입자를 찾을 수 없습니다.';
  end if;

  update public.app_users
     set role = clean_role,
         is_active = coalesce(active, true),
         updated_at = now()
   where id = target_user_id
   returning * into saved_user;

  if clean_role = 'counselor' then
    delete from public.class_memberships where student_id = target_user_id;
    delete from public.student_profiles where student_id = target_user_id;
  else
    delete from public.counselor_classes where counselor_id = target_user_id;
    insert into public.student_profiles (student_id)
    values (target_user_id)
    on conflict (student_id) do nothing;
  end if;

  return saved_user;
end;
$$;

create or replace function public.join_class_by_code(invite_code text)
returns public.counselor_classes
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_code text := public.normalize_class_code(invite_code);
  user_role text;
  target_class public.counselor_classes;
  member_count integer := 0;
begin
  select role
    into user_role
    from public.app_users
   where id = auth.uid();

  if user_role <> 'student' then
    raise exception '학생 계정만 반에 입장할 수 있습니다.';
  end if;

  select *
    into target_class
    from public.counselor_classes
   where join_code = clean_code;

  if target_class.id is null then
    raise exception '상담사 코드를 찾을 수 없습니다.';
  end if;

  if target_class.is_active = false then
    raise exception '현재 비활성화된 상담사 코드입니다.';
  end if;

  if not exists (
    select 1
      from public.app_users
     where id = target_class.counselor_id
       and role = 'counselor'
       and is_active = true
  ) then
    raise exception '현재 비활성화된 상담사 계정입니다.';
  end if;

  select count(*)
    into member_count
    from public.class_memberships
   where class_id = target_class.id
     and student_id <> auth.uid();

  if member_count >= target_class.max_students then
    raise exception '이 상담사의 학생 정원이 가득 찼습니다.';
  end if;

  insert into public.class_memberships (student_id, class_id)
  values (auth.uid(), target_class.id)
  on conflict (student_id) do update set
    class_id = excluded.class_id,
    joined_at = now();

  return target_class;
end;
$$;

alter table public.app_users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.counseling_journals enable row level security;
alter table public.app_settings enable row level security;
alter table public.counselor_classes enable row level security;
alter table public.class_memberships enable row level security;

drop policy if exists "app_users_select_own_or_counselor" on public.app_users;
create policy "app_users_select_own_or_counselor"
on public.app_users
for select
to authenticated
using (public.is_admin() or id = auth.uid() or public.is_counselor_for_student(id));

drop policy if exists "app_users_update_own" on public.app_users;
create policy "app_users_update_own"
on public.app_users
for update
to authenticated
using (public.is_admin() or id = auth.uid() or public.is_counselor_for_student(id))
with check (public.is_admin() or id = auth.uid() or public.is_counselor_for_student(id));

drop policy if exists "student_profiles_select_own_or_counselor" on public.student_profiles;
create policy "student_profiles_select_own_or_counselor"
on public.student_profiles
for select
to authenticated
using (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id));

drop policy if exists "student_profiles_upsert_own_or_counselor" on public.student_profiles;
create policy "student_profiles_upsert_own_or_counselor"
on public.student_profiles
for all
to authenticated
using (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id))
with check (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id));

drop policy if exists "requests_select_own_or_counselor" on public.consultation_requests;
create policy "requests_select_own_or_counselor"
on public.consultation_requests
for select
to authenticated
using (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id));

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
using (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id))
with check (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id));

drop policy if exists "journals_select_student_or_counselor" on public.counseling_journals;
create policy "journals_select_student_or_counselor"
on public.counseling_journals
for select
to authenticated
using (public.is_admin() or student_id = auth.uid() or public.is_counselor_for_student(student_id));

drop policy if exists "journals_manage_counselor" on public.counseling_journals;
create policy "journals_manage_counselor"
on public.counseling_journals
for all
to authenticated
using (public.is_admin() or public.is_counselor_for_student(student_id))
with check (public.is_admin() or (public.is_counselor_for_student(student_id) and counselor_id = auth.uid()));

drop policy if exists "classes_select_own_or_joined" on public.counselor_classes;
create policy "classes_select_own_or_joined"
on public.counselor_classes
for select
to authenticated
using (
  public.is_admin()
  or counselor_id = auth.uid()
  or exists (
    select 1
      from public.class_memberships membership
     where membership.class_id = id
       and membership.student_id = auth.uid()
  )
);

drop policy if exists "classes_insert_counselor_own" on public.counselor_classes;
drop policy if exists "classes_insert_admin" on public.counselor_classes;
create policy "classes_insert_admin"
on public.counselor_classes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "classes_update_counselor_own" on public.counselor_classes;
drop policy if exists "classes_update_admin" on public.counselor_classes;
create policy "classes_update_admin"
on public.counselor_classes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "memberships_select_own_or_class_owner" on public.class_memberships;
create policy "memberships_select_own_or_class_owner"
on public.class_memberships
for select
to authenticated
using (public.is_admin() or student_id = auth.uid() or public.is_class_owner(class_id));

create index if not exists app_users_role_idx on public.app_users(role);
create index if not exists app_users_school_idx on public.app_users(high_school, grade_level, class_name);
create index if not exists counselor_classes_counselor_idx on public.counselor_classes(counselor_id);
create index if not exists counselor_classes_join_code_idx on public.counselor_classes(join_code);
create index if not exists class_memberships_class_idx on public.class_memberships(class_id);
create index if not exists requests_student_status_idx on public.consultation_requests(student_id, status);
create index if not exists journals_student_date_idx on public.counseling_journals(student_id, date desc);
