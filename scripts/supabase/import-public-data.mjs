import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const INSERT_ORDER = [
  'profiles',
  'vestibulares',
  'important_dates',
  'user_alerts',
  'subscriptions',
  'verification_codes',
  'whatsapp_instances',
  'alert_logs',
];

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

async function upsertRows(supabase, table, rows) {
  if (!rows?.length) return;

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

const backupPath = process.argv[2];
if (!backupPath) {
  throw new Error('Uso: node scripts/supabase/import-public-data.mjs supabase-backups/arquivo.json');
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

for (const table of INSERT_ORDER) {
  const rows = backup.tables?.[table] || [];
  await upsertRows(supabase, table, rows);
  console.log(`${table}: ${rows.length} registros importados`);
}

console.log('Importação public concluída.');
console.log('Atenção: este script não recria senhas do Supabase Auth. Para preservar login, restaure auth.users via backup Postgres oficial.');
