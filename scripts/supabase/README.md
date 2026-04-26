# Migração Supabase

Este diretório contém utilitários para trocar o projeto Supabase do ZapVest.

## Migração com senhas preservadas

Para manter os logins funcionando sem reset de senha, migre usando backup/restore Postgres oficial ou `pg_dump`/`psql` com as connection strings dos dois projetos Supabase.

O ponto crítico é preservar:

- schema `auth`, especialmente `auth.users`
- schema `public`
- IDs de usuários, porque `profiles.id` referencia `auth.users.id`
- funções, triggers e policies

## Migração via URL + service role

Com apenas `Project URL` e `Service Role Key`, os scripts conseguem exportar/importar dados públicos e listar usuários do Auth, mas não exportam hashes de senha.

1. Exportar projeto atual:

```bash
node scripts/supabase/export-current.mjs
```

2. Criar `.env.migration.local` com as credenciais do projeto novo:

```env
NEW_NEXT_PUBLIC_SUPABASE_URL=https://novo-projeto.supabase.co
NEW_SUPABASE_SERVICE_ROLE_KEY=service-role-key-do-novo-projeto
```

3. Executar `supabase-setup.sql` no novo projeto pelo SQL Editor.

4. Se você migrou `auth.users` preservando IDs por backup Postgres, importar dados públicos:

```bash
node scripts/supabase/import-public-data.mjs supabase-backups/supabase-export-ARQUIVO.json
```

Se você não migrou `auth.users` com backup Postgres, use o importador com remapeamento:

```bash
node scripts/supabase/import-with-auth-remap.mjs supabase-backups/supabase-export-ARQUIVO.json
```

Esse caminho recria usuários no Auth do novo projeto, remapeia `profiles.id` e campos `user_id`, e mantém os relacionamentos internos. Os usuários precisarão redefinir senha.

5. Atualizar `.env.local` e as variáveis da Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://novo-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-ou-publishable-key-do-novo-projeto
SUPABASE_SERVICE_ROLE_KEY=service-role-key-do-novo-projeto
```

## Arquivos sensíveis

`supabase-backups/` e `.env.migration.local` estão no `.gitignore`. Não versione esses arquivos.
