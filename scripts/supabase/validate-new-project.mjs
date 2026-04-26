import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const TABLES = [
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

const env = {
  ...parseEnv(await readFile('.env.migration.local', 'utf8')),
  ...process.env,
};

const supabase = createClient(
  env.NEW_NEXT_PUBLIC_SUPABASE_URL,
  env.NEW_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

for (const table of TABLES) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log(`${table}: erro - ${error.message}`);
  } else {
    console.log(`${table}: ${count ?? 0}`);
  }
}

const { data: adminProfile, error: adminError } = await supabase
  .from('profiles')
  .select('id, email, is_admin, email_verified')
  .eq('email', 'webereaugusto@yahoo.com.br')
  .maybeSingle();

if (adminError) {
  console.log(`admin: erro - ${adminError.message}`);
} else {
  console.log(`admin: ${adminProfile ? JSON.stringify(adminProfile) : 'não encontrado'}`);
}
