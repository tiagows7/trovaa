-- Limite de conversas: não-VIP = 1 conversa ativa; VIP = várias ao mesmo tempo
-- Execute no SQL Editor do Supabase

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
  v_is_vip boolean;
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

  insert into public.conversations (state_code, user_a_id, user_b_id)
  values (p_state_code, auth.uid(), p_partner_id)
  returning id into v_conversation_id;

  delete from public.match_queue
  where user_id in (auth.uid(), p_partner_id);

  return v_conversation_id;
end;
$$;

grant execute on function public.start_conversation_with(uuid, text) to authenticated;
