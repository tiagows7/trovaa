-- Usuários salvos por VIP (pessoas com quem já conversou)

create table if not exists public.saved_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  saved_user_id uuid not null references auth.users (id) on delete cascade,
  last_state_code char(2) check (last_state_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  unique (user_id, saved_user_id),
  check (user_id <> saved_user_id)
);

create index if not exists saved_users_user_id_idx on public.saved_users (user_id);

alter table public.saved_users enable row level security;

create policy "Usuário vê seus contatos salvos"
  on public.saved_users for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuário salva contatos"
  on public.saved_users for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuário remove contatos salvos"
  on public.saved_users for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuário atualiza contatos salvos"
  on public.saved_users for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
