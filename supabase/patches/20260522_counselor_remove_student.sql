-- 상담사 화면의 학생 삭제 버튼용 RPC
-- 상담사는 본인 반에 연결된 학생만 목록에서 제거합니다.
-- 총관리자는 학생 app_users 행을 삭제해 연결된 profile/request/journal 데이터를 함께 정리합니다.

create or replace function public.remove_student_from_counselor(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    delete from public.app_users
     where id = target_student_id
       and role = 'student';
    return;
  end if;

  if not public.is_counselor_for_student(target_student_id) then
    raise exception '연결된 학생만 삭제할 수 있습니다.';
  end if;

  delete from public.class_memberships membership
  using public.counselor_classes counselor_class
  where membership.class_id = counselor_class.id
    and membership.student_id = target_student_id
    and counselor_class.counselor_id = auth.uid();
end;
$$;
