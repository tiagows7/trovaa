-- Corrige login dos usuários de teste (erro 500 "Database error querying schema")
-- Senha após rodar: teste123
-- E-mail Marina: marina.vip@test.trovaa

create extension if not exists pgcrypto;

-- Copia instance_id de uma conta que já funciona (ex.: admin)
update auth.users test_user
set instance_id = working.instance_id
from auth.users working
where working.email = 'tiagows7@gmail.com'
  and test_user.email like '%@test.trovaa'
  and working.instance_id is not null;

-- GoTrue exige strings vazias, não NULL
update auth.users
set
  aud = coalesce(aud, 'authenticated'),
  role = coalesce(role, 'authenticated'),
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  recovery_token = coalesce(recovery_token, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
  raw_app_meta_data = coalesce(
    raw_app_meta_data,
    '{"provider":"email","providers":["email"]}'::jsonb
  )
where email like '%@test.trovaa';

do $$
declare
  v_user record;
  v_password text := 'teste123';
begin
  for v_user in
    select id, email
    from auth.users
    where email like '%@test.trovaa'
  loop
    update auth.users
    set
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
    where id = v_user.id;

    delete from auth.identities
    where user_id = v_user.id;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user.id,
      jsonb_build_object(
        'sub', v_user.id::text,
        'email', v_user.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user.id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );
  end loop;
end $$;

select email, email_confirmed_at is not null as confirmado
from auth.users
where email like '%@test.trovaa'
order by email;
