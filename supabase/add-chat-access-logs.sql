-- Registros de acesso ao chat (Marco Civil — guarda por 6 meses)

create table if not exists public.chat_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ip_address text,
  user_agent text,
  screen_resolution text,
  timezone text,
  path text not null,
  state_code text,
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists chat_access_logs_created_at_idx
  on public.chat_access_logs (created_at desc);

create index if not exists chat_access_logs_user_id_idx
  on public.chat_access_logs (user_id);

alter table public.chat_access_logs enable row level security;

drop policy if exists "Admin vê registros de acesso ao chat" on public.chat_access_logs;

create policy "Admin vê registros de acesso ao chat"
  on public.chat_access_logs for select
  to authenticated
  using (public.is_admin());

create or replace function public.purge_chat_access_logs_older_than_six_months()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.chat_access_logs
  where created_at < now() - interval '6 months';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.purge_chat_access_logs_older_than_six_months() to service_role;
