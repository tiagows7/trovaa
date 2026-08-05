-- Usuários fictícios para testes (VIP e comuns)
-- Execute no SQL Editor do Supabase, DEPOIS de fix-missing-profile-columns.sql
-- Senha de todos: teste123
--
-- Cria contas em auth.users + perfis em public.profiles

create extension if not exists pgcrypto;

do $$
declare
  v_instance_id uuid;
  v_user_id uuid;
  v_email text;
  v_password text := 'teste123';
  v_username text;
  v_gender text;
  v_birth date;
  v_is_vip boolean;
  v_users jsonb := '[
    {"email":"marina.vip@test.trovaa","username":"Marina Silva","gender":"feminino","birth_date":"1998-03-12","is_vip":true},
    {"email":"lucas.vip@test.trovaa","username":"Lucas Ferreira","gender":"masculino","birth_date":"1995-07-22","is_vip":true},
    {"email":"beatriz.vip@test.trovaa","username":"Beatriz Costa","gender":"feminino","birth_date":"1992-11-05","is_vip":true},
    {"email":"ana@test.trovaa","username":"Ana Souza","gender":"feminino","birth_date":"2000-01-18","is_vip":false},
    {"email":"pedro@test.trovaa","username":"Pedro Lima","gender":"masculino","birth_date":"1999-08-30","is_vip":false},
    {"email":"carla@test.trovaa","username":"Carla Mendes","gender":"feminino","birth_date":"1997-04-14","is_vip":false},
    {"email":"rafael@test.trovaa","username":"Rafael Dias","gender":"masculino","birth_date":"1996-12-01","is_vip":false},
    {"email":"julia@test.trovaa","username":"Júlia Rocha","gender":"feminino","birth_date":"2001-06-09","is_vip":false}
  ]'::jsonb;
  v_user jsonb;
begin
  select id into v_instance_id from auth.instances limit 1;

  if v_instance_id is null then
    select instance_id into v_instance_id
    from auth.users
    where instance_id is not null
    limit 1;
  end if;

  if v_instance_id is null then
    v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  end if;

  for v_user in select * from jsonb_array_elements(v_users)
  loop
    v_email := v_user ->> 'email';
    v_username := v_user ->> 'username';
    v_gender := v_user ->> 'gender';
    v_birth := (v_user ->> 'birth_date')::date;
    v_is_vip := coalesce((v_user ->> 'is_vip')::boolean, false);

    select id into v_user_id
    from auth.users
    where lower(email) = lower(v_email);

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        email_change_token_current,
        recovery_token,
        phone_change,
        phone_change_token,
        reauthentication_token
      ) values (
        v_instance_id,
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_password, gen_salt('bf')),
        timezone('utc', now()),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'username', v_username,
          'birth_date', v_user ->> 'birth_date',
          'gender', v_gender,
          'terms_accepted_at', timezone('utc', now()),
          'privacy_accepted_at', timezone('utc', now()),
          'legal_version', '1.0'
        ),
        timezone('utc', now()),
        timezone('utc', now()),
        '', '', '', '', '', '', '', ''
      );

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
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', v_email,
          'email_verified', true
        ),
        'email',
        v_user_id::text,
        timezone('utc', now()),
        timezone('utc', now()),
        timezone('utc', now())
      );
    else
      update auth.users
      set
        encrypted_password = crypt(v_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
        raw_user_meta_data = jsonb_build_object(
          'username', v_username,
          'birth_date', v_user ->> 'birth_date',
          'gender', v_gender,
          'terms_accepted_at', timezone('utc', now()),
          'privacy_accepted_at', timezone('utc', now()),
          'legal_version', '1.0'
        ),
        updated_at = timezone('utc', now())
      where id = v_user_id;

      delete from auth.identities
      where user_id = v_user_id
        and provider = 'email';

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
        v_user_id,
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', v_email,
          'email_verified', true
        ),
        'email',
        v_user_id::text,
        timezone('utc', now()),
        timezone('utc', now()),
        timezone('utc', now())
      );
    end if;

    insert into public.profiles (id, username, birth_date, gender, is_vip, vip_until)
    values (
      v_user_id,
      v_username,
      v_birth,
      v_gender,
      v_is_vip,
      case when v_is_vip then timezone('utc', now()) + interval '1 year' else null end
    )
    on conflict (id) do update
    set
      username = excluded.username,
      birth_date = excluded.birth_date,
      gender = excluded.gender,
      is_vip = excluded.is_vip,
      vip_until = excluded.vip_until;
  end loop;
end $$;

-- Lista criada (para conferência)
select
  u.email,
  p.username,
  p.gender,
  p.is_vip,
  p.vip_until
from auth.users u
join public.profiles p on p.id = u.id
where u.email like '%@test.trovaa'
order by p.is_vip desc, u.email;
