import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

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

function sqlValue(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'";
    return `array[${value.map(sqlValue).join(', ')}]`;
  }
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function insertStatement(table, rows) {
  if (!rows?.length) return `-- ${table}: sem registros\n`;

  const columns = Object.keys(rows[0]);
  const values = rows.map((row) => `  (${columns.map((column) => sqlValue(row[column])).join(', ')})`);

  return [
    `insert into public.${table} (${columns.map((column) => `"${column}"`).join(', ')}) values`,
    values.join(',\n'),
    'on conflict do nothing;',
    '',
  ].join('\n');
}

const backupPath = process.argv[2];
if (!backupPath) {
  throw new Error('Uso: node scripts/supabase/generate-public-restore-sql.mjs supabase-backups/arquivo.json');
}

const backup = JSON.parse(await readFile(backupPath, 'utf8'));
const setupSql = await readFile('supabase-setup.sql', 'utf8');

const output = [
  '-- ZapVest Supabase restore bundle',
  '-- Execute este arquivo no SQL Editor do novo Supabase.',
  '-- Atenção: este bundle restaura schema public e dados public.',
  '-- Para preservar senhas de usuários, faça restore Postgres do schema auth com connection string.',
  '',
  'begin;',
  '',
  setupSql,
  '',
  '-- Dados públicos exportados',
  '',
  ...INSERT_ORDER.map((table) => insertStatement(table, backup.tables?.[table] || [])),
  '',
  'commit;',
  '',
].join('\n');

const outputDir = path.join(process.cwd(), 'supabase-backups');
await mkdir(outputDir, { recursive: true });

const outputPath = path.join(outputDir, 'restore-public.sql');
await writeFile(outputPath, output);

console.log(`SQL de restauração gerado em ${outputPath}`);
