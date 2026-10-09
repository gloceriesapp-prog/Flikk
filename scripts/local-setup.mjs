// One command to point the whole stack at a LOCAL Supabase on this machine:
//
//   npm run local:setup              start local Supabase, write every app's
//                                    .env.local, apply migrations + test data
//   npm run local:setup -- --no-db   same, without touching the database
//   npm run local:setup -- --ip 192.168.1.20   use this LAN address for the phone apps
//
// Needs Docker running, the Supabase CLI (npx supabase works) and psql
// (macOS: brew install libpq && brew link --force libpq).
//
// What it writes (existing values for other keys are kept; the previous file
// is saved once as .env.local.before-local-setup):
//   backend/.env.local          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//                               SEND_SMS_HOOK_SECRET, PORT=4000
//   apps/{customer,partner,rider}/.env.local
//                               EXPO_PUBLIC_API_URL=http://<this Mac's LAN IP>:4000
//   apps/customer/.env.local    EXPO_PUBLIC_SUPABASE_URL=http://<LAN IP>:54321
//   apps/admin, apps/landing    NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY (local)
//   apps/partner-dashboard,
//   apps/landing                NEXT_PUBLIC_API_URL=http://localhost:4000
//   supabase/.env               SEND_SMS_HOOK_SECRET (read by config.toml)
//
// Production is never touched: release builds read EAS environment
// variables, and Railway/Vercel have their own. See ENVIRONMENTS.md.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const path = (p) => `${root}${p}`;
const fail = (message) => { console.error(`\n✗ ${message}`); process.exit(1); };

function readEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split('\n')
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
}

// Replace the given keys in place, append missing ones, keep everything else.
function upsertEnv(relative, values) {
  const file = path(relative);
  const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const backup = `${file}.before-local-setup`;
  if (before && !existsSync(backup)) copyFileSync(file, backup);
  const lines = before ? before.replace(/\n$/, '').split('\n') : [];
  const pending = new Map(Object.entries(values));
  const next = lines.map((line) => {
    const key = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key); pending.delete(key);
    return `${key}=${value}`;
  });
  if (pending.size) next.push('', '# Written by npm run local:setup', ...[...pending].map(([k, v]) => `${k}=${v}`));
  writeFileSync(file, `${next.join('\n')}\n`, { mode: 0o600 });
  console.log(`  ✓ ${relative}: ${Object.keys(values).join(', ')}`);
}

function lanIp() {
  const candidates = Object.entries(networkInterfaces()).flatMap(([name, list]) =>
    (list ?? []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ name, address: a.address })));
  const isPrivate = (ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  // Wi-Fi/Ethernet first (en0/en1 on macOS), never Docker or VPN bridges.
  const ranked = candidates.filter((c) => isPrivate(c.address) && !/^(docker|br-|veth|utun|bridge|vmnet)/.test(c.name))
    .sort((a, b) => (/^en\d/.test(b.name) ? 1 : 0) - (/^en\d/.test(a.name) ? 1 : 0));
  return ranked[0]?.address;
}

function supabase(cliArgs, env = process.env) {
  return spawnSync('npx', ['--yes', 'supabase', ...cliArgs], { cwd: root, env, encoding: 'utf8' });
}

// 1. The hook secret must exist before Supabase starts: config.toml reads it.
const supabaseEnvFile = 'supabase/.env';
let secret = readEnv(path(supabaseEnvFile)).SEND_SMS_HOOK_SECRET;
const newSecret = !secret;
if (newSecret) secret = `v1,whsec_${randomBytes(32).toString('base64')}`;
upsertEnv(supabaseEnvFile, { SEND_SMS_HOOK_SECRET: secret });
const cliEnv = { ...process.env, SEND_SMS_HOOK_SECRET: secret };

// 2. Start (or restart, when the secret is new) local Supabase.
console.log('\nStarting local Supabase (Docker)…');
if (newSecret) supabase(['stop'], cliEnv);
const started = spawnSync('npx', ['--yes', 'supabase', 'start'], { cwd: root, env: cliEnv, stdio: 'inherit' });
if (started.status !== 0) fail('supabase start failed. Is Docker Desktop running?');
const status = supabase(['status', '-o', 'env'], cliEnv);
if (status.status !== 0) fail(`supabase status failed:\n${status.stderr}`);
const s = readEnvText(status.stdout);
function readEnvText(text) {
  return Object.fromEntries(text.split('\n').map((l) => l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]));
}
const apiUrl = s.API_URL;
const anonKey = s.ANON_KEY ?? s.PUBLISHABLE_KEY;
const serviceKey = s.SERVICE_ROLE_KEY ?? s.SECRET_KEY;
const dbUrl = s.DB_URL;
if (!apiUrl || !anonKey || !serviceKey || !dbUrl) fail('Could not read API_URL / keys / DB_URL from `supabase status -o env`.');

const ipFlag = args.indexOf('--ip');
const ip = ipFlag >= 0 ? args[ipFlag + 1] : lanIp();
if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) fail('No Wi-Fi/LAN IPv4 address found. Connect this computer and your phone to the same Wi-Fi, or pass --ip <address>.');
const apiPort = 4000;
const supabasePort = new URL(apiUrl).port || '54321';

// 3. Point every app at local services.
console.log(`\nWriting .env.local files (LAN IP ${ip})…`);
upsertEnv('backend/.env.local', {
  SUPABASE_URL: apiUrl, SUPABASE_SERVICE_ROLE_KEY: serviceKey, SEND_SMS_HOOK_SECRET: secret, PORT: String(apiPort),
});
for (const app of ['customer', 'partner', 'rider']) {
  upsertEnv(`apps/${app}/.env.local`, {
    EXPO_PUBLIC_API_URL: `http://${ip}:${apiPort}`,
    ...(app === 'customer' ? { EXPO_PUBLIC_SUPABASE_URL: `http://${ip}:${supabasePort}`, EXPO_PUBLIC_API_FOLLOW_METRO_HOST: 'true' } : {}),
  });
}
upsertEnv('apps/admin/.env.local', { NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey });
upsertEnv('apps/partner-dashboard/.env.local', { NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` });
upsertEnv('apps/landing/.env.local', { NEXT_PUBLIC_SUPABASE_URL: apiUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` });

// 4. Schema + fake test data in the local database.
if (!args.includes('--no-db')) {
  console.log('\nApplying migrations and test data to the local database…');
  const migrate = spawnSync('node', ['backend/scripts/db-migrate.mjs', '--seed'], { cwd: root, env: { ...process.env, DATABASE_URL: dbUrl }, stdio: 'inherit' });
  if (migrate.status !== 0) fail('Migrations failed (is psql installed? macOS: brew install libpq && brew link --force libpq).');
}

const backendEnv = readEnv(path('backend/.env.local'));
const msg91 = backendEnv.MSG91_AUTH_KEY && backendEnv.MSG91_OTP_TEMPLATE_ID;
console.log(`
✓ Local stack ready.

  Supabase Studio   http://127.0.0.1:54323
  Backend           cd backend && pnpm dev          (http://${ip}:${apiPort})
  Customer app      cd apps/customer && npx expo start --dev-client
  Partner app       cd apps/partner && npx expo start --dev-client
  Rider app         cd apps/rider && npx expo start --dev-client
  Admin             cd apps/admin && npm run dev     (http://localhost:3000)

  Login without SMS: 9100000001 / 9100000002 / 9100000003, OTP 123456.
  Login with a real number: ${msg91 ? 'MSG91 keys found — a real SMS is sent through the local backend.' : 'add MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID to backend/.env.local first.'}
  The phone must be on the same Wi-Fi as this computer. If your Wi-Fi IP changes, run this again.
`);
