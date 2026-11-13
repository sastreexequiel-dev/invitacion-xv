import { chromium, devices } from 'playwright';
import fs from 'fs';
import assert from 'assert';
import { execSync } from 'child_process';

const BASE = 'http://localhost:3000';
const SHOTS = './screenshots';
fs.mkdirSync(SHOTS, { recursive: true });
const keys = JSON.parse(fs.readFileSync('./keys.json', 'utf8'));
const rest = async (path, key = keys.SERVICE, init = {}) => {
  const r = await fetch(`http://localhost:54321/rest/v1/${path}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', ...(init.headers || {}) } });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const ok = (m) => console.log('✓', m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=user-gesture-required'] });

// ───────────────────────── 1. PANEL ─────────────────────────
const desk = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
const a = await desk.newPage();
await a.goto(`${BASE}/admin`);
assert.ok(a.url().includes('/admin/login'));
ok('/admin sin sesión redirige al login');

await a.fill('input[type=email]', 'intruso@xv.test');
await a.fill('input[type=password]', 'Clave-Segura-123');
await a.click('button:has-text("Ingresar")');
await a.waitForURL(/error=no-admin/);
await a.getByText('no tiene permisos').waitFor();
ok('usuario logueado sin rol admin es rechazado');

await a.fill('input[type=email]', 'admin@xv.test');
await a.fill('input[type=password]', 'contraseña-mal');
await a.click('button:has-text("Ingresar")');
await a.getByText('incorrectos').waitFor();
ok('contraseña incorrecta muestra error');

await a.fill('input[type=password]', 'Clave-Segura-123');
await a.click('button:has-text("Ingresar")');
await a.waitForURL(`${BASE}/admin`);
await a.getByText('Todavía no hay invitados').waitFor();
ok('admin ingresa al panel');

await a.click('button:has-text("+ Invitado")');
await a.locator('form[role=dialog] input').first().fill('Lucía Fernández');
await a.locator('form[role=dialog] input[type=number]').first().fill('2');
await a.click('form[role=dialog] button:has-text("Guardar")');
await a.getByText('Invitado agregado').waitFor();

await a.click('button:has-text("Carga masiva")');
await a.fill('form[role=dialog] textarea', 'Familia Pérez; 3; 5491122334455\nMartín Gómez; 0\nCamila Rojas\nlucia fernandez; 1');
await a.click('form[role=dialog] button:has-text("Guardar")');
await a.getByText('3 invitados agregados (1 repetidos omitidos)').waitFor();
ok('alta individual + carga masiva (omite duplicado "lucia fernandez")');

const { body: guests } = await rest('guests?select=*&order=created_at');
assert.equal(guests.length, 4);
const lucia = guests.find((g) => g.name === 'Lucía Fernández');
assert.equal(lucia.max_companions, 2);
ok(`4 invitados en la base; código de Lucía: ${lucia.code}`);

// ─────────────────── 2. INVITACIÓN EN IPHONE ───────────────────
const phone = await browser.newContext({ ...devices['iPhone 13'] });
await phone.addInitScript(() => {
  window.__audios = [];
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { if (!window.__audios.includes(this)) window.__audios.push(this); return orig.call(this); };
});
const p = await phone.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await p.goto(`${BASE}/invitacion?invitado=${lucia.code}`);
await sleep(4200);
await p.screenshot({ path: `${SHOTS}/01-bienvenida.png` });
const bodyText = await p.locator('body').innerText();
assert.ok(bodyText.includes('Para Lucía'));
assert.ok(!bodyText.includes('Martín') && !bodyText.includes('Pérez'));
ok('bienvenida personalizada ("Para Lucía") sin datos de otros invitados');

await p.click('button:has-text("Abrir invitación")');
await sleep(3800);
await p.screenshot({ path: `${SHOTS}/02-portada.png` });
const playing = await p.evaluate(() => window.__audios.length > 0 && !window.__audios[0].paused);
assert.ok(playing, 'la música debería sonar');
assert.equal(await p.getAttribute('[aria-label="Pausar música"]', 'aria-pressed'), 'true');
ok('al abrir arranca la música (después del clic)');

await p.click('[aria-label="Pausar música"]');
await sleep(900);
assert.ok(await p.evaluate(() => window.__audios[0].paused));
await p.click('[aria-label="Activar música"]');
await sleep(600);
assert.ok(await p.evaluate(() => !window.__audios[0].paused));
ok('botón de música pausa y reanuda');

// Mensaje
await p.locator('#mensaje').scrollIntoViewIfNeeded();
await sleep(1500);
await p.screenshot({ path: `${SHOTS}/03-mensaje.png` });

// Cuenta regresiva: comparar con cálculo independiente
const timer = p.locator('[role=timer]');
await timer.scrollIntoViewIfNeeded();
await sleep(1800);
await p.screenshot({ path: `${SHOTS}/04-cuenta-regresiva.png` });
const readTimer = async () => (await timer.locator('.text-gold').allInnerTexts()).map(Number);
const [d1, h1, m1, s1] = await readTimer();
const target = new Date('2027-03-20T21:30:00-03:00').getTime();
const left = Math.floor((target - Date.now()) / 1000);
const expected = [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60)];
assert.deepEqual([d1, h1, m1], expected, `contador ${[d1, h1, m1]} vs esperado ${expected}`);
await sleep(2100);
const [, , , s2] = await readTimer();
assert.ok(s1 !== s2, 'los segundos deben avanzar');
ok(`contador correcto: ${d1}d ${h1}h ${m1}m ${s1}s (esperado ${expected.join('/')}) y se actualiza`);

// Datos del evento
const details = p.getByText('Cómo llegar');
await details.scrollIntoViewIfNeeded();
await sleep(1500);
const maps = await p.locator('a:has-text("Cómo llegar")').getAttribute('href');
assert.ok(maps.startsWith('https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n%20Lumi%C3%A8re'));
const pageText = await p.locator('main').innerText();
assert.ok(/Sábado/i.test(pageText) && pageText.includes('21:30 hs') && pageText.includes('Elegante'));
ok('datos del evento (sábado, horario, salón, dress code) y "Cómo llegar" → Google Maps');
await p.getByText('La celebración').scrollIntoViewIfNeeded();
await sleep(1200);
await p.screenshot({ path: `${SHOTS}/05-celebracion.png` });
await p.locator('a:has-text("Cómo llegar")').scrollIntoViewIfNeeded();
await sleep(1200);
await p.screenshot({ path: `${SHOTS}/06-salon.png` });

// RSVP
await p.locator('#confirmar').scrollIntoViewIfNeeded();
await sleep(1500);
await p.click('button:has-text("Sí, voy")');
await sleep(600);
const plus = p.locator('[aria-label="Agregar acompañante"]');
await plus.click(); await plus.click();
assert.ok(await plus.isDisabled(), 'no debe permitir superar 2 acompañantes');
await p.fill('textarea', 'Soy celíaca 🙂');
await p.locator('form').scrollIntoViewIfNeeded();
await p.screenshot({ path: `${SHOTS}/07-rsvp.png`, fullPage: false });
await p.click('button:has-text("Confirmar")');
await p.getByText('¡Gracias!').waitFor();
await sleep(1500);
await p.screenshot({ path: `${SHOTS}/08-gracias.png` });
let { body: [row] } = await rest(`guests?code=eq.${lucia.code}&select=*`);
assert.equal(row.status, 'confirmed'); assert.equal(row.companions, 2); assert.equal(row.comment, 'Soy celíaca 🙂'); assert.ok(row.responded_at);
ok(`confirmación GUARDADA en la base: confirmed, 2 acompañantes, ${row.responded_at}`);

// Volver a entrar con el enlace y modificar
await p.goto(`${BASE}/invitacion?invitado=${lucia.code}`);
await p.click('button:has-text("Abrir invitación")', { timeout: 8000 });
await sleep(2500);
await p.getByText('Ya confirmaste tu asistencia con 2 acompañantes').scrollIntoViewIfNeeded();
await p.click('button:has-text("Modificar respuesta")');
await p.click('button:has-text("No puedo")');
await p.click('button:has-text("Actualizar respuesta")');
await p.getByText('Te vamos a extrañar').waitFor();
({ body: [row] } = await rest(`guests?code=eq.${lucia.code}&select=*`));
assert.equal(row.status, 'declined'); assert.equal(row.companions, 0);
assert.equal((await rest('guests?select=id')).body.length, 4);
ok('respuesta actualizada por enlace individual (declined) sin crear duplicados');

// Enlace general (sin código)
const p2 = await phone.newPage();
await p2.goto(BASE);
await p2.click('button:has-text("Abrir invitación")', { timeout: 8000 });
await sleep(2200);
await p2.locator('#confirmar').scrollIntoViewIfNeeded();
await p2.fill('input[autocomplete=name]', 'Sofía Ruiz');
await p2.click('button:has-text("Sí, voy")');
await p2.click('button:has-text("Confirmar")');
await p2.getByText('¡Gracias!').waitFor();
const editUrl = await p2.locator('input[readonly]').inputValue();
assert.match(editUrl, /\/invitacion\?invitado=[A-Z2-9]{10}$/);
ok(`confirmación desde enlace general crea registro y entrega enlace personal: ${editUrl}`);
await p2.click('button:has-text("Modificar respuesta")');
await p2.goto(BASE);
await p2.click('button:has-text("Abrir invitación")', { timeout: 8000 });
await sleep(2200);
await p2.locator('#confirmar').scrollIntoViewIfNeeded();
await p2.fill('input[autocomplete=name]', '  SOFIA   ruiz ');
await p2.click('button:has-text("Sí, voy")');
await p2.click('button:has-text("Confirmar")');
await p2.getByText('Ya hay una confirmación registrada con ese nombre').waitFor();
await p2.locator('p[role=alert]').scrollIntoViewIfNeeded();
await p2.screenshot({ path: `${SHOTS}/09-duplicado.png` });
assert.equal((await rest('guests?select=id')).body.length, 5);
ok('duplicado por nombre (mayúsculas/acentos/espacios) rechazado');

// Enlace inválido
const p3 = await phone.newPage();
await p3.goto(`${BASE}/invitacion?invitado=NOEXISTE99`);
assert.ok((await p3.locator('body').innerText()).length > 0);
await p3.click('button:has-text("Abrir invitación")', { timeout: 8000 });
await sleep(2000);
await p3.getByText('Enlace no válido').scrollIntoViewIfNeeded();
ok('código inexistente muestra "Enlace no válido"');

// Día del evento: reloj simulado del navegador
const p4ctx = await browser.newContext({ ...devices['iPhone 13'] });
const p4 = await p4ctx.newPage();
await p4.clock.setFixedTime(new Date('2027-03-20T21:30:05-03:00'));
await p4.goto(BASE);
await sleep(4200);
await p4.click('button:has-text("Abrir invitación")');
await sleep(3000);
await p4.getByText('¡Llegó el día!').scrollIntoViewIfNeeded();
await sleep(1800);
await p4.screenshot({ path: `${SHOTS}/10-dia-del-evento.png` });
ok('al llegar la fecha se muestra el mensaje especial');
await p4ctx.close();

// ─────────────────── 3. PANEL: estadísticas + export ───────────────────
await a.click('button[aria-label="Actualizar"]');
await sleep(1500);
const stat = async (label) => Number(await a.locator(`section[aria-label=Indicadores] button:has-text("${label}") p.font-serif`).innerText());
// Lucía declined, Sofía confirmed (0 acomp), 3 pendientes
assert.equal(await stat('Invitaciones'), 5);
assert.equal(await stat('Confirmados'), 1);
assert.equal(await stat('No asisten'), 1);
assert.equal(await stat('Pendientes'), 3);
assert.equal(await stat('Total asistentes'), 1);
ok('indicadores correctos (5 / 1 / 1 / 3 / 1 asistente)');

// editar: Familia Pérez confirma 3
await a.locator('tr:has-text("Familia Pérez") button:has-text("Editar")').click();
await a.selectOption('form[role=dialog] select', 'confirmed');
await a.locator('form[role=dialog] input[type=number]').nth(1).fill('3');
await a.click('form[role=dialog] button:has-text("Guardar")');
await a.getByText('Cambios guardados').waitFor();
await sleep(800);
assert.equal(await stat('Total asistentes'), 5);
ok('edición desde el panel: Familia Pérez +3 → total asistentes 5');

await a.fill('input[aria-label="Buscar invitado"]', 'perez');
await sleep(300);
assert.equal(await a.locator('tbody tr').count(), 1);
await a.fill('input[aria-label="Buscar invitado"]', '');
await a.click('.overflow-x-auto button:has-text("Pendientes")');
assert.equal(await a.locator('tbody tr').count(), 2);
await a.click('.overflow-x-auto button:has-text("Todos")');
ok('búsqueda sin acentos y filtro por estado');
await a.screenshot({ path: `${SHOTS}/11-panel.png`, fullPage: true });

const [dl1] = await Promise.all([a.waitForEvent('download'), a.click('button:has-text("CSV")')]);
const csvPath = `${SHOTS}/invitados.csv`; await dl1.saveAs(csvPath);
const csv = fs.readFileSync(csvPath, 'utf8');
assert.ok(csv.startsWith('﻿Nombre;Estado;'));
assert.ok(csv.includes('Familia Pérez;Confirmado;3;3;4'));
assert.equal(csv.trim().split('\r\n').length, 6);
const [dl2] = await Promise.all([a.waitForEvent('download'), a.click('button:has-text("Excel")')]);
const xPath = `${SHOTS}/invitados.xlsx`; await dl2.saveAs(xPath);
const sheet = execSync(`unzip -p ${xPath} xl/sharedStrings.xml xl/worksheets/sheet1.xml`).toString();
assert.ok(sheet.includes('Familia Pérez') && sheet.includes('TOTAL ASISTENTES'));
ok(`export CSV (${csv.length} bytes) y Excel .xlsx válidos con los datos`);

// eliminar
a.once('dialog', (d) => d.accept());
await a.locator('tr:has-text("Camila Rojas") button[aria-label^="Eliminar"]').click();
await a.getByText('Invitado eliminado').waitFor();
assert.equal((await rest('guests?select=id')).body.length, 4);
ok('eliminar registro');

// Panel en celular
const mob = await browser.newContext({ ...devices['iPhone 13'], storageState: await desk.storageState() });
const am = await mob.newPage();
await am.goto(`${BASE}/admin`);
await am.locator('li:has-text("Familia Pérez")').waitFor();
await am.screenshot({ path: `${SHOTS}/12-panel-movil.png` });
ok('panel usable en celular');

// cerrar sesión
await a.click('button:has-text("Salir")');
await a.waitForURL(/admin\/login/);
await a.goto(`${BASE}/admin`);
assert.ok(a.url().includes('/admin/login'));
ok('cerrar sesión vuelve a bloquear el panel');

assert.deepEqual(errors.filter((e) => !e.includes('favicon')), [], 'sin errores de consola');
ok('sin errores de JavaScript en la invitación');

await browser.close();
console.log('\nTODAS LAS PRUEBAS E2E PASARON');
