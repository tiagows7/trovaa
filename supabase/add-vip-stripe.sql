-- VIP + Stripe: execute no SQL Editor do Supabase

alter table public.profiles
  add column if not exists is_vip boolean not null default false,
  add column if not exists vip_until timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

create index if not exists profiles_is_vip_idx on public.profiles (is_vip);

-- Impede que usuários alterem o próprio status VIP pelo app.
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
  end if;

  return new;
end;
$$;

drop trigger if exists protect_vip_fields_before_update on public.profiles;

create trigger protect_vip_fields_before_update
  before update on public.profiles
  for each row
  execute function public.protect_vip_fields();
