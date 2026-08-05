-- Contador de visitas ao site (visível no painel /admin)

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_key text not null,
  path text not null default '/',
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);

create index if not exists site_visits_visitor_key_idx
  on public.site_visits (visitor_key);

alter table public.site_visits enable row level security;

drop policy if exists "Admin vê visitas" on public.site_visits;

create policy "Admin vê visitas"
  on public.site_visits for select
  to authenticated
  using (public.is_admin());

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

create or replace function public.get_site_visit_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  return jsonb_build_object(
    'total_visits',
      coalesce((select count(*)::int from public.site_visits), 0),
    'visits_today',
      coalesce((
        select count(*)::int
        from public.site_visits
        where created_at >= date_trunc('day', timezone('utc', now()))
      ), 0),
    'unique_visitors',
      coalesce((
        select count(distinct visitor_key)::int
        from public.site_visits
      ), 0)
  );
end;
$$;

grant execute on function public.get_site_visit_stats() to authenticated;
