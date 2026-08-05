# Trovaa

MVP de bate-papo em tempo real com **Next.js** + **Supabase**.

## O que já vem pronto

- Landing page
- Cadastro e login com e-mail/senha
- Sala de chat geral
- Mensagens em tempo real (Supabase Realtime)
- Histórico das últimas 100 mensagens

## Configuração (5 minutos)

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`
3. Em **Database → Replication**, confirme que a tabela `messages` está com Realtime ativo
4. Em **Authentication → Providers**, mantenha **Email** habilitado

### 2. Variáveis de ambiente

Copie o exemplo e preencha com os dados do seu projeto:

```bash
cp .env.local.example .env.local
```

No painel do Supabase: **Project Settings → API**

- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public key

### 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## Estrutura

```
src/
  app/           # páginas (/, /login, /signup, /chat)
  components/    # AuthForm, ChatRoom
  lib/supabase/  # clientes browser e server
supabase/
  schema.sql     # tabelas e políticas RLS
```

## Próximos passos (quando quiser evoluir)

- Salas privadas ou múltiplas salas
- Login com Google
- Envio de imagens
- Status online / “digitando…”
- Deploy na Vercel
