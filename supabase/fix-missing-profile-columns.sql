-- Execute ESTE arquivo no SQL Editor do Supabase se aparecer erro
-- "column profiles.is_vip does not exist" ou "is_admin does not exist"
--
-- Ordem: VIP → Admin → demais migrações do projeto

-- ========== VIP + Stripe ==========
alter table public.profiles
  add column if not exists is_vip boolean not null default false,
  add column if not exists vip_until timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_is_vip_idx on public.profiles (is_vip);

-- ========== Admin + sugestões ==========
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

create or replace function public.protect_profile_privileged_fields()
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
    new.is_admin := old.is_admin;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_vip_fields_before_update on public.profiles;
drop trigger if exists protect_profile_privileged_fields_before_update on public.profiles;

create trigger protect_profile_privileged_fields_before_update
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 10 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists suggestions_created_at_idx on public.suggestions (created_at desc);
create index if not exists suggestions_user_id_idx on public.suggestions (user_id);

alter table public.suggestions enable row level security;

drop policy if exists "Usuário envia sugestão" on public.suggestions;
drop policy if exists "Usuário vê as próprias sugestões" on public.suggestions;
drop policy if exists "Admin vê todas as sugestões" on public.suggestions;

create policy "Usuário envia sugestão"
  on public.suggestions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuário vê as próprias sugestões"
  on public.suggestions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admin vê todas as sugestões"
  on public.suggestions for select
  to authenticated
  using (public.is_admin());

-- Admin padrão (tiagows7@gmail.com)
update public.profiles
set username = coalesce(nullif(trim(username), ''), 'tiago ws'),
    is_admin = true
where id = (select id from auth.users where email = 'tiagows7@gmail.com');

insert into public.profiles (id, username, is_admin)
select id, 'tiago ws', true
from auth.users
where email = 'tiagows7@gmail.com'
on conflict (id) do update
set username = excluded.username,
    is_admin = true;

update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'tiagows7@gmail.com';
