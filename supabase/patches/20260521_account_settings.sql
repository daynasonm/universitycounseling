-- Account settings support: optional phone number and auth email sync.
-- Supabase Dashboard > SQL Editor 에 붙여넣고 Run 하세요.

alter table public.app_users add column if not exists phone text;

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
