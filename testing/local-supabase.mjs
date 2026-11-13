// Mini-Supabase local para pruebas: Postgres + GoTrue + PostgREST + gateway
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'fs';
import http from 'http';
import crypto from 'crypto';
import { spawn, execFileSync } from 'child_process';

const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(payload);
  const s = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
};
const exp = 2000000000;
const ANON = jwt({ role: 'anon', iss: 'supabase', exp });
const SERVICE = jwt({ role: 'service_role', iss: 'supabase', exp });
fs.writeFileSync('keys.json', JSON.stringify({ ANON, SERVICE, SECRET }));

const db = new EmbeddedPostgres({ databaseDir: '/tmp/pgstack', user: 'postgres', password: 'pw', port: 5545, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C.UTF-8'] });
await db.initialise(); await db.start();
const c = new pg.Client({ host: 'localhost', port: 5545, user: 'postgres', password: 'pw', database: 'postgres' });
await c.connect();
await c.query(`
  create role anon nologin noinherit; create role authenticated nologin noinherit; create role service_role nologin noinherit bypassrls;
  create role authenticator login noinherit password 'pw'; grant anon, authenticated, service_role to authenticator;
  create role supabase_auth_admin login superuser password 'pw';
  create schema auth authorization supabase_auth_admin;
  create schema extensions; create extension pgcrypto schema extensions;
  grant usage on schema public, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter role postgres set search_path = public, extensions;
`);

const env = {
  ...process.env,
  GOTRUE_DB_DRIVER: 'postgres', DB_NAMESPACE: 'auth',
  DATABASE_URL: 'postgres://supabase_auth_admin:pw@localhost:5545/postgres?search_path=auth',
  GOTRUE_DB_DATABASE_URL: 'postgres://supabase_auth_admin:pw@localhost:5545/postgres?search_path=auth',
  GOTRUE_API_HOST: '127.0.0.1', PORT: '9999', API_EXTERNAL_URL: 'http://localhost:54321/auth/v1',
  GOTRUE_SITE_URL: 'http://localhost:3000', GOTRUE_JWT_SECRET: SECRET, GOTRUE_JWT_EXP: '3600',
  GOTRUE_JWT_AUD: 'authenticated', GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated', GOTRUE_JWT_ADMIN_ROLES: 'service_role',
  GOTRUE_DISABLE_SIGNUP: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'true', GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
  GOTRUE_LOG_LEVEL: 'warn', GOTRUE_RATE_LIMIT_HEADER: '',
};
execFileSync('./auth', ['migrate'], { env, cwd: './bin', stdio: 'inherit' });
// GoTrue crea auth.uid(); damos permisos como Supabase
await c.query(`grant usage on schema auth to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;`);
await c.query(`set search_path = public, extensions;` + fs.readFileSync(process.argv[2], 'utf8'));
await c.query(`grant all on public.guests to service_role; grant all on public.admins to service_role; notify pgrst, 'reload schema';`);
console.log('schema aplicado');

const gotrue = spawn('./auth', ['serve'], { env, cwd: './bin', stdio: 'inherit' });
fs.writeFileSync('pgrst.conf', `db-uri = "postgres://authenticator:pw@localhost:5545/postgres"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${SECRET}"\nserver-port = 3001\nserver-host = "127.0.0.1"\ndb-extra-search-path = "public, extensions"\n`);
const pgrst = spawn('./bin/postgrest', ['pgrst.conf'], { stdio: 'inherit' });

// Gateway estilo Supabase: /auth/v1 → GoTrue, /rest/v1 → PostgREST
http.createServer((req, res) => {
  const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-credentials': 'true',
    'access-control-allow-headers': req.headers['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  let port, path;
  if (req.url.startsWith('/auth/v1')) { port = 9999; path = req.url.slice(8) || '/'; }
  else if (req.url.startsWith('/rest/v1')) { port = 3001; path = req.url.slice(8) || '/'; }
  else { res.writeHead(404); return res.end(); }
  const headers = { ...req.headers, host: `127.0.0.1:${port}` };
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const p = http.request({ host: '127.0.0.1', port, path, method: req.method, headers }, (r) => { res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res); });
  p.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(54321, () => console.log('gateway en http://localhost:54321'));

await new Promise((r) => setTimeout(r, 2500));
// Crear usuario admin vía API de GoTrue + alta en admins
const r = await fetch('http://localhost:54321/auth/v1/admin/users', {
  method: 'POST', headers: { 'content-type': 'application/json', apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  body: JSON.stringify({ email: 'admin@xv.test', password: 'Clave-Segura-123', email_confirm: true }),
});
const u = await r.json();
console.log('admin user', r.status, u.id || u);
await c.query(`insert into public.admins(user_id) values ($1)`, [u.id]);
// Usuario logueado SIN permisos (para probar el bloqueo)
await fetch('http://localhost:54321/auth/v1/admin/users', {
  method: 'POST', headers: { 'content-type': 'application/json', apikey: SERVICE, authorization: `Bearer ${SERVICE}` },
  body: JSON.stringify({ email: 'intruso@xv.test', password: 'Clave-Segura-123', email_confirm: true }),
});
console.log('STACK LISTO');
process.on('SIGTERM', async () => { gotrue.kill(); pgrst.kill(); await db.stop(); process.exit(0); });
