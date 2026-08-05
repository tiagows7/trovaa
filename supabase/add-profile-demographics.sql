-- Data de nascimento e sexo no perfil

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists gender text check (gender in ('masculino', 'feminino', 'outro'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, birth_date, gender)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      split_part(new.email, '@', 1),
      'usuario'
    ),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    nullif(new.raw_user_meta_data ->> 'gender', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Impede alteração manual de campos sensíveis pelo app.
create or replace function public.protect_vip_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    new.is_vip := old.is_vip;
    new.vip_until := old.vip_until;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.birth_date := old.birth_date;
    new.gender := old.gender;
  end if;

  return new;
end;
$$;
