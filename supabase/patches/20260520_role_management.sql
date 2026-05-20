-- 관리자 화면에서 가입자를 학생/상담사로 전환하기 위한 RPC입니다.
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run 하세요.

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

create or replace function public.normalize_class_code(code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

alter table public.app_users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.counseling_journals enable row level security;
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

drop policy if exists "classes_insert_admin" on public.counselor_classes;
create policy "classes_insert_admin"
on public.counselor_classes
for insert
to authenticated
with check (public.is_admin());

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

grant execute on function public.join_class_by_code(text) to authenticated;

notify pgrst, 'reload schema';
