# Invitación digital · XV años

Invitación web interactiva con confirmación de asistencia (RSVP) real y panel privado de administración.

**Tecnología:** Next.js 16 · React 19 · Tailwind CSS · Framer Motion · Supabase (PostgreSQL + Auth) · Vercel (hosting gratuito)

---

## Qué incluye

| Parte | Dirección | Descripción |
|---|---|---|
| Invitación pública | `/` | Bienvenida animada, música, cuenta regresiva, datos del evento, RSVP |
| Invitación personal | `/invitacion?invitado=CODIGO` | Igual, pero saluda al invitado, respeta su cupo de acompañantes y permite modificar la respuesta |
| Panel privado | `/admin` | Login, indicadores, búsqueda, filtros, alta / edición / borrado, carga masiva, envío por WhatsApp, exportación a Excel y CSV |

---

## 1. Personalizar los datos (sin programar)

Todo se edita en **un solo archivo: `config/event.ts`**:

- nombre de la quinceañera, fecha y hora (`date`), horario de recepción y fin
- salón, dirección y enlace de Google Maps (si lo dejás vacío se genera solo)
- código de vestimenta, mensaje de bienvenida y frase
- música (`music.src`), foto principal (`heroImage`) e imagen para compartir (`shareImage`)
- fecha límite para confirmar, acompañantes por defecto, si se acepta confirmar desde el enlace general (`allowOpenRsvp`), cupo previsto
- título y descripción que aparecen en WhatsApp

**Música:** reemplazá `public/music/ambient.mp3` por tu canción en .mp3 (ideal: menos de 3 MB, 128 kbps). La pista incluida es una composición ambiental original generada para este proyecto, sin derechos de terceros.

**Foto:** copiá la imagen a `public/images/` (vertical, JPG de menos de 400 KB) y poné `heroImage: "/images/foto.jpg"`. Si no hay foto, se muestra el monograma dorado.

**Imagen de WhatsApp:** se genera sola con el nombre y la fecha (`/opengraph-image`). Si querés una propia, poné una imagen de 1200×630 en `public/images/` y escribí la ruta en `shareImage`.

---

## 2. Configurar la base de datos (Supabase, gratis)

1. Creá una cuenta en <https://supabase.com> → **New project** (región: São Paulo). Guardá la contraseña de la base de datos.
2. **SQL Editor → New query** → pegá todo el contenido de `supabase/schema.sql` → **Run**.
3. **Authentication → Sign In / Providers**: desactivá **"Allow new users to sign up"**. Así nadie puede crearse una cuenta. Aunque alguien lo lograra, igual no podría ver datos sin estar en la tabla `admins`.
4. **Authentication → Users → Add user → Create new user**: tu email y una contraseña fuerte. Marcá *Auto Confirm User*.
5. Volvé al **SQL Editor** y dale permisos de administrador a ese usuario:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-email@ejemplo.com'
   on conflict do nothing;
   ```
   Repetí los pasos 4 y 5 para cada persona de la familia que deba entrar al panel.
6. **Project Settings → API** (o *API Keys*): copiá
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *anon / publishable key* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role / secret key* → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**)

> **Proyectos gratuitos de Supabase:** se pausan tras 7 días sin actividad. Las confirmaciones y tus visitas al panel cuentan como actividad. Si se pausa, se reactiva desde el panel de Supabase con un clic y los datos no se pierden.

---

## 3. Publicar en Internet (Vercel, gratis)

1. Subí esta carpeta a un repositorio de GitHub (privado).
2. En <https://vercel.com> → **Add New → Project** → importá el repositorio (Vercel detecta Next.js solo).
3. En **Environment Variables** cargá las 4 variables de `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → la dirección final, por ejemplo `https://mis15-valentina.vercel.app`
4. **Deploy**. En 1–2 minutos tenés la dirección pública.
5. *(Opcional)* Dominio propio (ej. `mis15valentina.com`): Vercel → Settings → Domains. Después actualizá `NEXT_PUBLIC_SITE_URL` y volvé a desplegar.

Cada vez que cambies `config/event.ts` y subas el cambio a GitHub, Vercel publica la nueva versión automáticamente.

**Probarlo en tu computadora:** `npm install`, copiá `.env.example` como `.env.local` con tus claves, luego `npm run dev` y abrí <http://localhost:3000>.

---

## 4. Cargar invitados y compartir por WhatsApp

1. Entrá a `https://TU-SITIO/admin` con tu usuario.
2. **+ Invitado** (uno por uno) o **Carga masiva** (pegás una lista, una persona o familia por línea):
   ```
   Familia Pérez; 3; 5491122334455
   Lucía Fernández; 1
   Martín Gómez
   ```
   El formato es `nombre; acompañantes máximos; WhatsApp`. Los dos últimos datos son opcionales.
3. Cada invitado recibe un **código único** y su enlace personal: `https://TU-SITIO/invitacion?invitado=K7QXM2PA9R`.
4. Botón **WhatsApp** en cada fila: abre WhatsApp con un mensaje listo y el enlace personal (y con el número cargado, directo a ese chat). El botón **Enlace** lo copia.
5. **Enlace general** (para grupos o estados): compartí `https://TU-SITIO/`. Quien confirme desde ahí queda registrado como "enlace general" y recibe su propio enlace para modificar la respuesta. Para aceptar solo enlaces personales, poné `allowOpenRsvp: false`.

**Vista previa en WhatsApp:** muestra título, descripción e imagen dorada. WhatsApp guarda en caché la primera vista previa que genera, así que conviene revisarla mandándote el enlace a vos mismo *antes* de enviarlo a todos. Si después cambiás la imagen, podés forzar una nueva agregando `?v=2` al final del enlace general.

---

## 5. Seguridad: cómo está protegido

- **Los datos de los invitados nunca llegan al navegador público.** La tabla tiene RLS (Row Level Security) activado y ninguna política para visitantes anónimos. Las confirmaciones pasan por `/api/rsvp` en el servidor, que valida todo con Zod y llama a funciones SQL que vuelven a validar (cupo de acompañantes, largo de los textos, duplicados).
- **Cada enlace personal** muestra solo el nombre de ese invitado y su cupo, nunca teléfono, notas internas ni datos de otros. Los códigos son aleatorios (10 caracteres, 31¹⁰ combinaciones).
- **Sin duplicados:** al confirmar desde el enlace general, se compara el nombre normalizado (sin mayúsculas, acentos ni espacios extra) con todos los invitados. Con enlace personal, la respuesta se actualiza en el mismo registro.
- **Panel:** se verifica en tres capas: `proxy.ts` (redirige al login), la página del servidor y las políticas RLS de la base (`is_admin()`). Un usuario logueado que no esté en `admins` ve 0 registros.
- **Claves:** la `service_role` vive solo en variables de entorno del servidor (está protegida con `server-only` y se verificó que no aparece en el JavaScript publicado).
- **Extras:** honeypot anti-bots, límite de intentos por IP, cabeceras de seguridad, `noindex` (no aparece en Google) y protección contra inyección de fórmulas en el CSV.

---

## 6. Pruebas realizadas

- `npm test`: cuenta regresiva (5 pruebas, incluye el cambio de día y la fecha cumplida).
- `testing/db.test.mjs`: esquema SQL en PostgreSQL real, con 19 pruebas de permisos, RLS, validaciones y duplicados.
- `testing/e2e.mjs`: 25 pruebas de punta a punta en Chrome emulando un iPhone 13, contra Postgres + GoTrue + PostgREST (los mismos componentes que usa Supabase): login y bloqueo del panel, alta y carga masiva, invitación personalizada, música que se activa y se pausa, contador comparado con un cálculo independiente, Google Maps, confirmación guardada en la base con fecha y hora, modificación sin duplicar, rechazo de duplicados, mensaje del día del evento, indicadores, edición, búsqueda, filtros, exportación a Excel y CSV, borrado y cierre de sesión.

Ver `testing/README.md` para correrlas.

---

## Estructura

```
config/event.ts          ← TODOS los datos editables
supabase/schema.sql      ← base de datos, seguridad y funciones
app/page.tsx             ← invitación (/ y /invitacion)
app/api/rsvp/route.ts    ← registro de confirmaciones (servidor)
app/admin/               ← panel privado + login
app/opengraph-image.tsx  ← imagen para WhatsApp
components/              ← bienvenida, partículas, contador, RSVP, música, panel
lib/                     ← clientes de Supabase, formato de fechas, exportación
proxy.ts                 ← protección de /admin
public/music, public/images
```
