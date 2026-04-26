import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const TABLE_ORDER = [
  'vestibulares',
  'important_dates',
  'profiles',
  'user_alerts',
  'subscriptions',
  'verification_codes',
  'whatsapp_instances',
  'alert_logs',
];

const CLEANUP_ORDER = [
  'alert_logs',
  'verification_codes',
  'subscriptions',
  'user_alerts',
  'important_dates',
  'vestibulares',
  'whatsapp_instances',
];

const USER_ID_COLUMNS = {
  profiles: ['id'],
  user_alerts: ['user_id'],
  subscriptions: ['user_id'],
  verification_codes: ['user_id'],
};

function parseEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...value] = line.split('=');
        return [key, value.join('=').replace(/^["']|["']$/g, '')];
      })
  );
}

async function loadEnv() {
  const envPath = process.env.MIGRATION_ENV || '.env.migration.local';
  const fileEnv = parseEnv(await readFile(envPath, 'utf8'));
  return { ...fileEnv, ...process.env };
}

async function assertSchemaExists(supabase) {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    throw new Error(`Schema ainda não disponível no novo Supabase: ${error.message}. Execute supabase-setup.sql antes deste script.`);
  }
}

function remapRows(table, rows, idMap) {
  const columns = USER_ID_COLUMNS[table] || [];
  return rows.map((row) => {
    const next = { ...row };
    for (const column of columns) {
      if (next[column] && idMap[next[column]]) {
        next[column] = idMap[next[column]];
      }
    }
    return next;
  });
}

async function getExistingUserByEmail(supabase, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
}

async function ensureAuthUser(supabase, sourceUser) {
  if (!sourceUser.email) return null;

  const existing = await getExistingUserByEmail(supabase, sourceUser.email);
  if (existing) return existing;

  const password = `${randomBytes(24).toString('base64url')}aA1!`;
  const { data, error } = await supabase.auth.admin.createUser({
    email: sourceUser.email,
    password,
    email_confirm: Boolean(sourceUser.email_confirmed_at || sourceUser.confirmed_at),
    phone: sourceUser.phone || undefined,
    phone_confirm: Boolean(sourceUser.phone_confirmed_at),
    app_metadata: sourceUser.app_metadata || {},
    user_metadata: sourceUser.user_metadata || {},
  });

  if (error) throw new Error(`${sourceUser.email}: ${error.message}`);
  return data.user;
}

async function upsertRows(supabase, table, rows) {
  if (!rows?.length) return;

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function deleteExistingRows(supabase, table) {
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error && !error.message.toLowerCase().includes('could not find the table')) {
    throw new Error(`${table}: ${error.message}`);
  }
}

const backupPath = process.argv[2];
if (!backupPath) {
  throw new Error('Uso: node scripts/supabase/import-with-auth-remap.mjs supabase-backups/arquivo.json');
}

const env = await loadEnv();
const destinationUrl = env.NEW_NEXT_PUBLIC_SUPABASE_URL;
const destinationServiceRoleKey = env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!destinationUrl || !destinationServiceRoleKey) {
  throw new Error('Configure NEW_NEXT_PUBLIC_SUPABASE_URL e NEW_SUPABASE_SERVICE_ROLE_KEY em .env.migration.local.');
}

const backup = JSON.parse(await readFile(backupPath, 'utf8'));
const supabase = createClient(destinationUrl, destinationServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

await assertSchemaExists(supabase);

const idMap = {};
for (const sourceUser of backup.authUsers || []) {
  const user = await ensureAuthUser(supabase, sourceUser);
  if (user) {
    idMap[sourceUser.id] = user.id;
    console.log(`auth.users: ${sourceUser.email} -> ${user.id}`);
  }
}

for (const table of CLEANUP_ORDER) {
  await deleteExistingRows(supabase, table);
  console.log(`${table}: dados existentes removidos`);
}

for (const table of TABLE_ORDER) {
  const rows = remapRows(table, backup.tables?.[table] || [], idMap);
  await upsertRows(supabase, table, rows);
  console.log(`${table}: ${rows.length} registros importados`);
}

const outputDir = path.join(process.cwd(), 'supabase-backups');
await mkdir(outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, 'auth-user-id-map.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), idMap }, null, 2)
);

console.log('Importação concluída com remapeamento de usuários.');
console.log('Usuários precisarão usar "Esqueci a senha" para definir uma senha no novo Supabase.');
