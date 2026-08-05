-- Promove tiagows7@gmail.com a administrador e garante o perfil
-- Execute no SQL Editor do Supabase (como postgres / service role)

update public.profiles
set
  username = 'tiago ws',
  is_admin = true
where id = (
  select id from auth.users where email = 'tiagows7@gmail.com'
);

-- Se o perfil ainda não existir (cadastro recente), cria manualmente:
insert into public.profiles (id, username, is_admin)
select id, 'tiago ws', true
from auth.users
where email = 'tiagows7@gmail.com'
on conflict (id) do update
set username = excluded.username,
    is_admin = true;

-- Opcional: confirmar e-mail sem precisar clicar no link (facilita login imediato)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'tiagows7@gmail.com';
