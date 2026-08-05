-- Conversas privadas 1-a-1 com fila de matchmaking por estado e gênero

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  state_code char(2) not null check (state_code ~ '^[A-Z]{2}$'),
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  check (user_a_id <> user_b_id)
);

create index if not exists conversations_user_a_idx on public.conversations (user_a_id);
create index if not exists conversations_user_b_idx on public.conversations (user_b_id);
create index if not exists conversations_state_idx on public.conversations (state_code);

alter table public.conversations enable row level security;

create policy "Participantes veem a conversa"
  on public.conversations for select
  to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conversation_idx
  on public.conversation_messages (conversation_id, created_at);

alter table public.conversation_messages enable row level security;

create policy "Participantes leem mensagens da conversa"
  on public.conversation_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create policy "Participante envia na própria conversa"
  on public.conversation_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and c.ended_at is null
        and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
    )
  );

create table if not exists public.match_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state_code char(2) not null check (state_code ~ '^[A-Z]{2}$'),
  preferred_gender text not null check (preferred_gender in ('masculino', 'feminino', 'outro')),
  created_at timestamptz not null default now()
);

create index if not exists match_queue_state_idx on public.match_queue (state_code, created_at);

alter table public.match_queue enable row level security;

create policy "Usuário vê a própria fila"
  on public.match_queue for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuário entra na fila"
  on public.match_queue for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Usuário sai da fila"
  on public.match_queue for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Usuário atualiza a própria fila"
  on public.match_queue for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tenta parear usuário na fila (preferência mútua + mesmo estado)
create or replace function public.try_match_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state text;
  v_pref text;
  v_gender text;
  v_partner_id uuid;
  v_conversation_id uuid;
begin
  select mq.state_code, mq.preferred_gender, p.gender
  into v_state, v_pref, v_gender
  from public.match_queue mq
  join public.profiles p on p.id = mq.user_id
  where mq.user_id = p_user_id;

  if not found or v_gender is null then
    return null;
  end if;

  select mq.user_id
  into v_partner_id
  from public.match_queue mq
  join public.profiles p on p.id = mq.user_id
  where mq.state_code = v_state
    and mq.user_id <> p_user_id
    and mq.preferred_gender = v_gender
    and v_pref = p.gender
    and p.gender is not null
  order by mq.created_at asc
  limit 1;

  if v_partner_id is null then
    return null;
  end if;

  insert into public.conversations (state_code, user_a_id, user_b_id)
  values (v_state, p_user_id, v_partner_id)
  returning id into v_conversation_id;

  delete from public.match_queue
  where user_id in (p_user_id, v_partner_id);

  return v_conversation_id;
end;
$$;

grant execute on function public.try_match_user(uuid) to authenticated;

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_messages;
