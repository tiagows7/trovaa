-- Desativa confirmação de e-mail no cadastro (ambiente de testes)
-- Execute no SQL Editor do Supabase.
--
-- Também recomendado no painel:
-- Authentication → Providers → Email → desmarque "Confirm email"

-- Confirma automaticamente novos cadastros
create or replace function public.auto_confirm_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now()))
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists auto_confirm_new_user on auth.users;

create trigger auto_confirm_new_user
  after insert on auth.users
  for each row
  execute function public.auto_confirm_new_user();

-- Confirma contas já existentes que ainda não foram confirmadas
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now()))
where email_confirmed_at is null;
