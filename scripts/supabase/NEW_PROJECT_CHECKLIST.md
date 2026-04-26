# Checklist do Novo Supabase

Execute estes passos no painel do novo Supabase.

## 1. Criar schema público

No SQL Editor do novo Supabase, execute:

```text
supabase-setup.sql
```

Este arquivo cria o schema `public`, policies, triggers e dados iniciais.

## 2. Auth e senhas

O restore via SQL gerado não preserva hashes de senha do Supabase Auth.

Para preservar login sem reset de senha, use backup/restore Postgres oficial incluindo o schema `auth`.

Se seguir com a migração manual por SQL Editor e sem connection string Postgres:

- rode `node scripts/supabase/import-with-auth-remap.mjs supabase-backups/supabase-export-2026-04-26T20-57-36-537Z.json`.

Esse script recria usuários no Auth do novo projeto, remapeia `profiles.id` e campos `user_id`, e salva o mapa em `supabase-backups/auth-user-id-map.json`.

Os usuários precisarão usar "Esqueci a senha" para definir uma senha no novo projeto.

## Caminho alternativo com Auth preservado

Use `supabase-backups/restore-public.sql` somente se você já tiver migrado `auth.users` por backup/restore Postgres oficial, preservando os IDs antigos.

## 3. Redirect URLs

Configure em Authentication > URL Configuration:

- Site URL local: `http://localhost:3000`
- Redirect URL local: `http://localhost:3000/auth/callback`
- Site URL produção: domínio de produção do ZapVest
- Redirect URL produção: `https://SEU-DOMINIO/auth/callback`

## 4. Variáveis do app

O `.env.local` já foi atualizado para o novo Supabase.

Atualize também na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Depois faça redeploy.

## 5. Validação

Após executar o SQL e configurar Auth:

- criar uma conta nova
- promover um usuário para admin com `profiles.is_admin = true`
- acessar `/admin`
- acessar `/dashboard`
- testar verificação de e-mail
- testar WhatsApp em `/admin/evolution`
