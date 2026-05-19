-- 관리자 화면에서 가입자를 학생/상담사로 전환하기 위한 RPC입니다.
-- Supabase Dashboard > SQL Editor > New query 에 붙여넣고 Run 하세요.

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

notify pgrst, 'reload schema';
