-- Execute no SQL Editor para habilitar salas por estado

alter table public.messages
  add column if not exists state_code char(2);

update public.messages
set state_code = 'SP'
where state_code is null;

alter table public.messages
  alter column state_code set not null;

alter table public.messages
  drop constraint if exists messages_state_code_check;

alter table public.messages
  add constraint messages_state_code_check
  check (state_code ~ '^[A-Z]{2}$');

create index if not exists messages_state_created_at_idx
  on public.messages (state_code, created_at);

drop policy if exists "Usuário envia mensagens" on public.messages;

create policy "Usuário envia mensagens"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and state_code is not null
  );
