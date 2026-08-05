-- Atualiza record_site_visit para retornar JSON (evita resposta {} no navegador)

create or replace function public.record_site_visit(
  p_visitor_key text,
  p_path text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_visitor_key is null or char_length(trim(p_visitor_key)) < 8 then
    return jsonb_build_object('recorded', false, 'reason', 'invalid_visitor_key');
  end if;

  v_user_id := auth.uid();

  insert into public.site_visits (visitor_key, path, user_id)
  values (trim(p_visitor_key), coalesce(nullif(trim(p_path), ''), '/'), v_user_id);

  return jsonb_build_object('recorded', true);
end;
$$;

grant execute on function public.record_site_visit(text, text) to anon, authenticated;
