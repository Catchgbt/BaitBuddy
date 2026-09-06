#!/usr/bin/env node
// Erzeugt alle Secrets fuer docker/.env: JWT_SECRET, dazu passende ANON_KEY und
// SERVICE_ROLE_KEY (HS256-JWTs wie in der Supabase-Cloud), POSTGRES_PASSWORD,
// CRON_SECRET, DASHBOARD_PASSWORD. Bereits gesetzte Werte bleiben erhalten.
//
//   node docker/scripts/generate-keys.mjs           # fuellt leere Felder
//   node docker/scripts/generate-keys.mjs --force   # erzeugt alles neu
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', '.env');
const examplePath = join(here, '..', '.env.example');
const force = process.argv.includes('--force');

if (!existsSync(envPath)) {
  writeFileSync(envPath, readFileSync(examplePath));
  console.log('docker/.env aus .env.example angelegt');
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : '';
};
const set = (key, value) => {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (idx === -1) lines.push(`${key}=${value}`);
  else lines[idx] = `${key}=${value}`;
};
const ensure = (key, make) => {
  if (force || !get(key)) {
    set(key, make());
    console.log(`${key} gesetzt`);
  }
};

// Passwort ohne Sonderzeichen, damit es in Connection-Strings ohne Encoding funktioniert
const alnum = (n) => randomBytes(n * 2).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, n);

ensure('POSTGRES_PASSWORD', () => alnum(32));
ensure('JWT_SECRET', () => alnum(48));
ensure('CRON_SECRET', () => alnum(40));
ensure('DASHBOARD_PASSWORD', () => alnum(24));

const secret = get('JWT_SECRET');
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 3600; // 10 Jahre, wie Supabase-Cloud-Keys
if (force || !get('ANON_KEY')) {
  set('ANON_KEY', signJwt({ role: 'anon', iss: 'supabase', iat, exp }, secret));
  console.log('ANON_KEY gesetzt');
}
if (force || !get('SERVICE_ROLE_KEY')) {
  set('SERVICE_ROLE_KEY', signJwt({ role: 'service_role', iss: 'supabase', iat, exp }, secret));
  console.log('SERVICE_ROLE_KEY gesetzt');
}

writeFileSync(envPath, lines.join('\n'));
console.log(`Fertig: ${envPath}`);
