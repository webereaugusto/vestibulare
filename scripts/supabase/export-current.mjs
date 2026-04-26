import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PUBLIC_TABLES = [
  'profiles',
  'vestibulares',
  'important_dates',
  'user_alerts',
  'alert_logs',
  'subscriptions',
  'verification_codes',
  'whatsapp_instances',
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
  const envPath = process.env.MIGRATION_ENV || '.env.local';
  const fileEnv = parseEnv(await readFile(envPath, 'utf8'));
  return { ...fileEnv, ...process.env };
}

async function selectAll(supabase, table) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select('*').range(from, to);

    if (error) {
      if (
        error.code === '42P01'
        || error.code === 'PGRST205'
        || error.message.toLowerCase().includes('could not find the table')
      ) {
        return [];
      }
      throw new Error(`${table}: ${error.message}`);
    }

    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function listAuthUsers(supabase) {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    users.push(...(data.users || []));
    if (!data.users || data.users.length < 1000) break;
  }

  return users;
}

const env = await loadEnv();
const sourceUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sourceServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!sourceUrl || !sourceServiceRoleKey) {
  throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local ou MIGRATION_ENV.');
}

const supabase = createClient(sourceUrl, sourceServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const backup = {
  exportedAt: new Date().toISOString(),
  sourceUrl,
  note: 'Auth export via Admin API does not include password hashes. Use Postgres backup/restore for password-preserving migration.',
  authUsers: await listAuthUsers(supabase),
  tables: {},
};

for (const table of PUBLIC_TABLES) {
  backup.tables[table] = await selectAll(supabase, table);
  console.log(`${table}: ${backup.tables[table].length} registros`);
}

console.log(`auth.users: ${backup.authUsers.length} usuários`);

const outputDir = path.join(process.cwd(), 'supabase-backups');
await mkdir(outputDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = path.join(outputDir, `supabase-export-${stamp}.json`);
await writeFile(outputPath, JSON.stringify(backup, null, 2));

console.log(`Backup salvo em ${outputPath}`);
