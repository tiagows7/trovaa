-- Admin + sugestões de melhorias

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- Impede alteração de VIP e admin pelo próprio usuário
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

-- Torne alguém administrador (substitua o e-mail):
-- update public.profiles
-- set is_admin = true
-- where id = (select id from auth.users where email = 'seu@email.com');
