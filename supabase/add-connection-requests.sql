-- Pedidos de conexão: o alvo precisa aceitar antes de abrir a conversa
-- Execute no SQL Editor do Supabase

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  state_code char(2) not null check (state_code ~ '^[A-Z]{2}$'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  conversation_id uuid references public.conversations (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> target_id)
);

create index if not exists connection_requests_target_pending_idx
  on public.connection_requests (target_id, created_at desc)
  where status = 'pending';

create index if not exists connection_requests_requester_pending_idx
  on public.connection_requests (requester_id, created_at desc)
  where status = 'pending';

alter table public.connection_requests enable row level security;

create policy "Participantes veem pedidos de conexão"
  on public.connection_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

create or replace function public.user_is_vip(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.is_vip
        and (p.vip_until is null or p.vip_until > timezone('utc', now()))
      from public.profiles p
      where p.id = p_user_id
    ),
    false
  );
$$;

grant execute on function public.user_is_vip(uuid) to authenticated;

create or replace function public.save_vip_contact(
  p_user_id uuid,
  p_partner_id uuid,
  p_state_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_is_vip(p_user_id) then
    return;
  end if;

  insert into public.saved_users (user_id, saved_user_id, last_state_code)
  values (p_user_id, p_partner_id, p_state_code)
  on conflict (user_id, saved_user_id)
  do update set last_state_code = excluded.last_state_code;
end;
$$;

grant execute on function public.save_vip_contact(uuid, uuid, text) to authenticated;

create or replace function public.request_connection(
  p_target_id uuid,
  p_state_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := auth.uid();
  v_existing_conv uuid;
  v_request_id uuid;
  v_is_vip boolean;
begin
  if v_requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_id = v_requester_id then
    raise exception 'Cannot connect with yourself';
  end if;

  if p_state_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid state code';
  end if;

  select c.id
  into v_existing_conv
  from public.conversations c
  where c.ended_at is null
    and (
      (c.user_a_id = v_requester_id and c.user_b_id = p_target_id)
      or (c.user_a_id = p_target_id and c.user_b_id = v_requester_id)
    )
  limit 1;

  if v_existing_conv is not null then
    return jsonb_build_object(
      'status', 'existing',
      'conversation_id', v_existing_conv
    );
  end if;

  v_is_vip := public.user_is_vip(v_requester_id);

  if not v_is_vip then
    if exists (
      select 1
      from public.conversations c
      where c.ended_at is null
        and (c.user_a_id = v_requester_id or c.user_b_id = v_requester_id)
    ) then
      raise exception
        using
          errcode = 'P0001',
          message = 'NON_VIP_SINGLE_CHAT_LIMIT',
          detail = 'Usuários sem VIP só podem manter uma conversa ativa por vez.';
    end if;
  end if;

  update public.connection_requests
  set status = 'cancelled', responded_at = timezone('utc', now())
  where requester_id = v_requester_id
    and status = 'pending';

  update public.connection_requests
  set status = 'cancelled', responded_at = timezone('utc', now())
  where requester_id = v_requester_id
    and target_id = p_target_id
    and status = 'pending';

  insert into public.connection_requests (requester_id, target_id, state_code)
  values (v_requester_id, p_target_id, p_state_code)
  returning id into v_request_id;

  return jsonb_build_object(
    'status', 'pending',
    'request_id', v_request_id
  );
end;
$$;

create or replace function public.accept_connection(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.connection_requests%rowtype;
  v_conversation_id uuid;
  v_is_vip boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_request
  from public.connection_requests
  where id = p_request_id
  for update;

  if not found or v_request.target_id <> auth.uid() then
    raise exception 'Invalid connection request';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Connection request is no longer pending';
  end if;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.ended_at is null
    and (
      (c.user_a_id = v_request.requester_id and c.user_b_id = v_request.target_id)
      or (c.user_a_id = v_request.target_id and c.user_b_id = v_request.requester_id)
    )
  limit 1;

  if v_conversation_id is null then
    v_is_vip := public.user_is_vip(auth.uid());

    if not v_is_vip then
      if exists (
        select 1
        from public.conversations c
        where c.ended_at is null
          and (c.user_a_id = auth.uid() or c.user_b_id = auth.uid())
      ) then
        raise exception
          using
            errcode = 'P0001',
            message = 'NON_VIP_SINGLE_CHAT_LIMIT',
            detail = 'Usuários sem VIP só podem manter uma conversa ativa por vez.';
      end if;
    end if;

    if not public.user_is_vip(v_request.requester_id) then
      if exists (
        select 1
        from public.conversations c
        where c.ended_at is null
          and (c.user_a_id = v_request.requester_id or c.user_b_id = v_request.requester_id)
      ) then
        update public.connection_requests
        set status = 'cancelled', responded_at = timezone('utc', now())
        where id = p_request_id;

        raise exception 'Requester already has an active conversation';
      end if;
    end if;

    insert into public.conversations (state_code, user_a_id, user_b_id)
    values (v_request.state_code, v_request.requester_id, v_request.target_id)
    returning id into v_conversation_id;

    delete from public.match_queue
    where user_id in (v_request.requester_id, v_request.target_id);

    perform public.save_vip_contact(
      v_request.requester_id,
      v_request.target_id,
      v_request.state_code
    );
    perform public.save_vip_contact(
      v_request.target_id,
      v_request.requester_id,
      v_request.state_code
    );
  end if;

  update public.connection_requests
  set
    status = 'accepted',
    conversation_id = v_conversation_id,
    responded_at = timezone('utc', now())
  where id = p_request_id;

  return v_conversation_id;
end;
$$;

create or replace function public.decline_connection(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.connection_requests
  set status = 'declined', responded_at = timezone('utc', now())
  where id = p_request_id
    and target_id = auth.uid()
    and status = 'pending';
end;
$$;

create or replace function public.cancel_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.connection_requests
  set status = 'cancelled', responded_at = timezone('utc', now())
  where id = p_request_id
    and requester_id = auth.uid()
    and status = 'pending';
end;
$$;

grant execute on function public.request_connection(uuid, text) to authenticated;
grant execute on function public.accept_connection(uuid) to authenticated;
grant execute on function public.decline_connection(uuid) to authenticated;
grant execute on function public.cancel_connection_request(uuid) to authenticated;

create or replace function public.end_my_active_conversations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.connection_requests
  set status = 'cancelled', responded_at = timezone('utc', now())
  where status = 'pending'
    and (requester_id = auth.uid() or target_id = auth.uid());

  update public.conversations
  set ended_at = timezone('utc', now())
  where ended_at is null
    and (user_a_id = auth.uid() or user_b_id = auth.uid());
end;
$$;

grant execute on function public.end_my_active_conversations() to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.connection_requests;
exception
  when duplicate_object then null;
end;
$$;
