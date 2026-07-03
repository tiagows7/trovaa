-- Execute este SQL no Supabase: SQL Editor > New query > Run

-- Perfis de usuário
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Perfis visíveis para todos"
  on public.profiles for select
  using (true);

create policy "Usuário cria o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Usuário edita o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Mensagens do chat
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx on public.messages (created_at);

alter table public.messages enable row level security;

create policy "Mensagens visíveis para autenticados"
  on public.messages for select
  to authenticated
  using (true);

create policy "Usuário envia mensagens"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.messages;
