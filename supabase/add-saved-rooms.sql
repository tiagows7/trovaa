-- Salas / conversas salvas por usuário

create table if not exists public.saved_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  state_code char(2) not null check (state_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  unique (user_id, state_code)
);

create index if not exists saved_rooms_user_id_idx on public.saved_rooms (user_id);

alter table public.saved_rooms enable row level security;

create policy "Usuário vê suas salas salvas"
  on public.saved_rooms for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuário salva salas"
  on public.saved_rooms for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuário remove salas salvas"
  on public.saved_rooms for delete
  to authenticated
  using (auth.uid() = user_id);
