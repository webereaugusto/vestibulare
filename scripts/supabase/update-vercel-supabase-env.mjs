import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ENV_MAP = {
  NEXT_PUBLIC_SUPABASE_URL: 'NEW_NEXT_PUBLIC_SUPABASE_URL',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'NEW_NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_ROLE_KEY: 'NEW_SUPABASE_SERVICE_ROLE_KEY',
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

const env = parseEnv(readFileSync('.env.migration.local', 'utf8'));

for (const [vercelName, migrationName] of Object.entries(ENV_MAP)) {
  const value = env[migrationName];
  if (!value) throw new Error(`${migrationName} não configurada em .env.migration.local`);

  run('npx', ['vercel', 'env', 'rm', vercelName, 'production', '-y']);
  run('npx', ['vercel', 'env', 'add', vercelName, 'production'], {
    input: value,
  });

  console.log(`${vercelName}: atualizado em production`);
}
