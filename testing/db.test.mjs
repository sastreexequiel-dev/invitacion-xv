import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'fs';
import assert from 'assert';

const db = new EmbeddedPostgres({ databaseDir: '/tmp/pgdata_xv', user: 'postgres', password: 'pw', port: 5544, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C.UTF-8'] });
await db.initialise();
await db.start();
const c = new pg.Client({ host: 'localhost', port: 5544, user: 'postgres', password: 'pw', database: 'postgres' });
await c.connect();

// --- Simular lo que Supabase ya trae ---
await c.query(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema extensions; create extension pgcrypto schema extensions;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  set search_path = public, extensions;
`);
const sql = fs.readFileSync(process.argv[2], 'utf8');
await c.query(sql);
await c.query(sql); // idempotente
console.log('✓ schema se ejecuta dos veces sin errores');
await c.query(`grant all on public.guests to service_role;`);

const as = async (role, sub, q, params = []) => {
  await c.query('begin');
  try {
    await c.query(`set local role ${role}`);
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub || '']);
    const r = await c.query(q, params);
    await c.query('commit');
    return r;
  } catch (e) { await c.query('rollback'); throw e; }
};
const fails = async (p, label) => { try { await p; assert.fail('debía fallar: ' + label); } catch (e) { if (e.code === 'ERR_ASSERTION') throw e; return e.message; } };

const { rows: [admin] } = await c.query(`insert into auth.users(email) values('admin@x.com') returning id`);
const { rows: [intruso] } = await c.query(`insert into auth.users(email) values('otro@x.com') returning id`);
await c.query(`insert into public.admins(user_id) values ($1)`, [admin.id]);

// Admin crea invitados
const ins = await as('authenticated', admin.id, `insert into guests(name, max_companions) values ('Lucía Fernández', 2), ('Martín Gómez', 0) returning code, name`);
assert.equal(ins.rows.length, 2);
assert.match(ins.rows[0].code, /^[A-HJ-NP-Z2-9]{10}$/);
console.log('✓ admin crea invitados; código generado:', ins.rows[0].code);
const lucia = ins.rows[0].code, martin = ins.rows[1].code;

// Anónimo no puede leer ni ejecutar funciones
console.log('✓ anon select bloqueado:', await fails(as('anon', null, 'select * from guests'), 'anon select'));
console.log('✓ anon rpc bloqueado:', await fails(as('anon', null, `select * from rsvp_get($1)`, [lucia]), 'anon rpc'));
console.log('✓ authenticated rpc bloqueado:', await fails(as('authenticated', intruso.id, `select * from rsvp_get($1)`, [lucia]), 'auth rpc'));

// Usuario logueado que no es admin no ve nada ni puede insertar
const r0 = await as('authenticated', intruso.id, 'select * from guests');
assert.equal(r0.rows.length, 0);
console.log('✓ usuario no-admin ve 0 invitados');
console.log('✓ no-admin insert bloqueado:', await fails(as('authenticated', intruso.id, `insert into guests(name) values('Hack')`), 'insert'));
const upd = await as('authenticated', intruso.id, `update guests set status='confirmed'`);
assert.equal(upd.rowCount, 0);
console.log('✓ no-admin update no afecta filas');

// Servidor (service_role)
const g = await as('service_role', null, `select * from rsvp_get($1)`, [lucia.toLowerCase()]);
assert.equal(g.rows[0].name, 'Lucía Fernández'); assert.equal(g.rows[0].status, 'pending');
assert.equal(Object.keys(g.rows[0]).includes('phone'), false);
console.log('✓ rsvp_get devuelve solo datos propios (sin teléfono/notas), código case-insensitive');
assert.equal((await as('service_role', null, `select * from rsvp_get('NOEXISTE')`)).rows.length, 0);

const s1 = await as('service_role', null, `select * from rsvp_submit_by_code($1,$2,$3,$4,$5)`, [lucia, '  Lucía   Fernández ', true, 2, 'Vamos!']);
assert.equal(s1.rows[0].status, 'confirmed'); assert.equal(s1.rows[0].companions, 2); assert.ok(s1.rows[0].responded_at);
console.log('✓ confirmación por código guardada con fecha/hora:', s1.rows[0].responded_at.toISOString());
console.log('✓ exceder acompañantes bloqueado:', await fails(as('service_role', null, `select * from rsvp_submit_by_code($1,'Lucía Fernández',true,3,null)`, [lucia]), 'max'));
console.log('✓ código inválido:', await fails(as('service_role', null, `select * from rsvp_submit_by_code('ZZZZ','Ana',true,0,null)`), 'code'));
const s2 = await as('service_role', null, `select * from rsvp_submit_by_code($1,'Lucía Fernández',false,2,null)`, [lucia]);
assert.equal(s2.rows[0].status, 'declined'); assert.equal(s2.rows[0].companions, 0);
const cnt = await c.query(`select count(*)::int n from guests`);
assert.equal(cnt.rows[0].n, 2);
console.log('✓ actualizar respuesta no duplica (sigue habiendo 2 registros); rechazar pone acompañantes en 0');

const o1 = await as('service_role', null, `select * from rsvp_submit_open('Sofía Ruiz', true, 1, null, 1)`);
assert.equal(o1.rows[0].status, 'confirmed'); assert.match(o1.rows[0].code, /^[A-Z2-9]{10}$/);
console.log('✓ confirmación abierta crea registro con código propio:', o1.rows[0].code);
console.log('✓ duplicado por nombre (mayúsculas/acentos/espacios) bloqueado:', await fails(as('service_role', null, `select * from rsvp_submit_open('  SOFIA   ruiz ', true, 0, null, 1)`), 'dup'));
console.log('✓ duplicado contra invitado del panel bloqueado:', await fails(as('service_role', null, `select * from rsvp_submit_open('martin gomez', true, 0, null, 1)`), 'dup2'));
console.log('✓ abierta excediendo cupo bloqueado:', await fails(as('service_role', null, `select * from rsvp_submit_open('Pedro Paz', true, 2, null, 1)`), 'max open'));

// Admin edita / elimina
const ed = await as('authenticated', admin.id, `update guests set max_companions=3 where code=$1 returning updated_at > created_at as touched`, [martin]);
assert.equal(ed.rowCount, 1);
const del = await as('authenticated', admin.id, `delete from guests where code=$1`, [martin]);
assert.equal(del.rowCount, 1);
console.log('✓ admin edita y elimina');
console.log('✓ check de integridad:', await fails(c.query(`update guests set companions=5 where code=$1`, [lucia]), 'constraint'));

await c.end(); await db.stop();
console.log('\nTODAS LAS PRUEBAS DE BASE DE DATOS PASARON');
