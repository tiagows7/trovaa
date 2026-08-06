-- Permite multiplas conversas ativas para todos os usuarios
-- Execute no SQL Editor do Supabase

create or replace function public.start_conversation_with(
  p_partner_id uuid,
  p_state_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_partner_id = auth.uid() then
    raise exception 'Cannot chat with yourself';
  end if;

  if p_state_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid state code';
  end if;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.ended_at is null
    and (
      (c.user_a_id = auth.uid() and c.user_b_id = p_partner_id)
      or (c.user_a_id = p_partner_id and c.user_b_id = auth.uid())
    )
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.conversations (state_code, user_a_id, user_b_id)
  values (p_state_code, auth.uid(), p_partner_id)
  returning id into v_conversation_id;

  delete from public.match_queue
  where user_id in (auth.uid(), p_partner_id);

  return v_conversation_id;
end;
$$;

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
