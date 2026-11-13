-- =====================================================================
--  INVITACIÓN XV · ESQUEMA DE BASE DE DATOS (Supabase / PostgreSQL)
-- =====================================================================
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Es idempotente: se puede volver a ejecutar sin perder datos.
--
--  Modelo de seguridad
--  -------------------
--  * La tabla `guests` tiene RLS activado y NINGUNA política para el rol
--    anónimo: desde el navegador nadie puede leer ni escribir invitados.
--  * Los invitados confirman a través del servidor de Next.js (/api/rsvp),
--    que usa la service_role key (variable de entorno, nunca en el
--    frontend) y llama a las funciones `rsvp_*` de abajo, que validan todo.
--  * El panel de administración usa Supabase Auth. Solo los usuarios
--    listados en `admins` pueden leer/editar invitados (políticas RLS).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  Generador de códigos de invitación (sin caracteres ambiguos: 0/O, 1/I/L)
-- ---------------------------------------------------------------------
create or replace function public.generate_guest_code(len int default 10)
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(len);
  result text := '';
  i int;
begin
  for i in 0 .. len - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Normaliza nombres para detectar duplicados ("  ana   PÉREZ " = "ana perez")
create or replace function public.normalize_name(n text)
returns text
language sql
immutable
as $$
  select lower(
    translate(
      regexp_replace(trim(coalesce(n, '')), '\s+', ' ', 'g'),
      'ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòù',
      'AEIOUUNaeiouunAEIOUaeiou'
    )
  );
$$;

-- ---------------------------------------------------------------------
--  Tabla de invitados
-- ---------------------------------------------------------------------
create table if not exists public.guests (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique default public.generate_guest_code(),
  name            text not null check (char_length(trim(name)) between 2 and 120),
  name_key        text generated always as (public.normalize_name(name)) stored,
  phone           text check (phone is null or char_length(phone) <= 40),
  notes           text check (notes is null or char_length(notes) <= 500),   -- notas internas (solo admin)
  max_companions  int  not null default 0 check (max_companions between 0 and 20),
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  companions      int  not null default 0 check (companions >= 0),
  comment         text check (comment is null or char_length(comment) <= 500), -- comentario del invitado
  source          text not null default 'admin' check (source in ('admin', 'open')),
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint companions_within_max check (companions <= max_companions),
  constraint declined_has_no_companions check (status <> 'declined' or companions = 0)
);

create index if not exists guests_name_key_idx on public.guests (name_key);
create index if not exists guests_status_idx   on public.guests (status);

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guests_touch on public.guests;
create trigger guests_touch before update on public.guests
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
--  Administradores
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
--  Row Level Security
-- ---------------------------------------------------------------------
alter table public.guests enable row level security;
alter table public.admins enable row level security;

-- Nadie anónimo toca estas tablas
revoke all on public.guests from anon;
revoke all on public.admins from anon;
grant select, insert, update, delete on public.guests to authenticated;
grant select on public.admins to authenticated;

drop policy if exists "admins_select_guests" on public.guests;
drop policy if exists "admins_insert_guests" on public.guests;
drop policy if exists "admins_update_guests" on public.guests;
drop policy if exists "admins_delete_guests" on public.guests;
create policy "admins_select_guests" on public.guests for select to authenticated using (public.is_admin());
create policy "admins_insert_guests" on public.guests for insert to authenticated with check (public.is_admin());
create policy "admins_update_guests" on public.guests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins_delete_guests" on public.guests for delete to authenticated using (public.is_admin());

-- Cada usuario solo puede ver su propia fila en admins (para saber si es admin)
drop policy if exists "admins_read_self" on public.admins;
create policy "admins_read_self" on public.admins for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
--  Funciones de confirmación (solo las invoca el servidor con service_role)
-- ---------------------------------------------------------------------

-- Datos mínimos de UNA invitación a partir de su código.
-- Nunca devuelve teléfono, notas internas ni datos de otros invitados.
create or replace function public.rsvp_get(p_code text)
returns table (
  name text, max_companions int, status text, companions int, comment text, responded_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select g.name, g.max_companions, g.status, g.companions, g.comment, g.responded_at
  from public.guests g
  where g.code = upper(trim(p_code));
$$;

-- Confirmación desde un enlace personal (?invitado=CODIGO). Crea o actualiza la respuesta.
create or replace function public.rsvp_submit_by_code(
  p_code text, p_name text, p_attending boolean, p_companions int, p_comment text
)
returns table (code text, name text, status text, companions int, max_companions int, responded_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.guests%rowtype;
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_comp int := coalesce(p_companions, 0);
begin
  select * into g from public.guests where guests.code = upper(trim(p_code)) for update;
  if not found then
    raise exception 'INVALID_CODE' using errcode = 'P0002';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if p_attending is null then
    raise exception 'INVALID_ATTENDING' using errcode = '22023';
  end if;
  if not p_attending then v_comp := 0; end if;
  if v_comp < 0 or v_comp > g.max_companions then
    raise exception 'INVALID_COMPANIONS' using errcode = '22023';
  end if;
  if v_comment is not null and char_length(v_comment) > 500 then
    raise exception 'INVALID_COMMENT' using errcode = '22023';
  end if;

  update public.guests set
    name = v_name,
    status = case when p_attending then 'confirmed' else 'declined' end,
    companions = v_comp,
    comment = v_comment,
    responded_at = now()
  where id = g.id;

  return query
    select x.code, x.name, x.status, x.companions, x.max_companions, x.responded_at
    from public.guests x where x.id = g.id;
end;
$$;

-- Confirmación desde el enlace general (sin código). Crea un registro nuevo
-- y devuelve su código para que el invitado pueda modificar la respuesta luego.
-- Evita duplicados comparando el nombre normalizado contra TODOS los invitados.
create or replace function public.rsvp_submit_open(
  p_name text, p_attending boolean, p_companions int, p_comment text, p_max_companions int
)
returns table (code text, name text, status text, companions int, max_companions int, responded_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_comp int := coalesce(p_companions, 0);
  v_max int := greatest(0, least(coalesce(p_max_companions, 0), 20));
  v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if p_attending is null then
    raise exception 'INVALID_ATTENDING' using errcode = '22023';
  end if;
  if not p_attending then v_comp := 0; end if;
  if v_comp < 0 or v_comp > v_max then
    raise exception 'INVALID_COMPANIONS' using errcode = '22023';
  end if;
  if v_comment is not null and char_length(v_comment) > 500 then
    raise exception 'INVALID_COMMENT' using errcode = '22023';
  end if;

  -- Bloqueo por nombre para evitar dos inserciones simultáneas iguales
  perform pg_advisory_xact_lock(hashtext(public.normalize_name(v_name)));

  if exists (select 1 from public.guests g where g.name_key = public.normalize_name(v_name)) then
    raise exception 'DUPLICATE_NAME' using errcode = '23505';
  end if;

  insert into public.guests (name, max_companions, status, companions, comment, source, responded_at)
  values (v_name, v_max, case when p_attending then 'confirmed' else 'declined' end, v_comp, v_comment, 'open', now())
  returning id into v_id;

  return query
    select x.code, x.name, x.status, x.companions, x.max_companions, x.responded_at
    from public.guests x where x.id = v_id;
end;
$$;

-- Solo el servidor (service_role) puede ejecutarlas
revoke all on function public.rsvp_get(text) from public, anon, authenticated;
revoke all on function public.rsvp_submit_by_code(text, text, boolean, int, text) from public, anon, authenticated;
revoke all on function public.rsvp_submit_open(text, boolean, int, text, int) from public, anon, authenticated;
grant execute on function public.rsvp_get(text) to service_role;
grant execute on function public.rsvp_submit_by_code(text, text, boolean, int, text) to service_role;
grant execute on function public.rsvp_submit_open(text, boolean, int, text, int) to service_role;

-- =====================================================================
--  ALTA DEL ADMINISTRADOR (ejecutar después de crear el usuario en
--  Authentication → Users → Add user). Reemplazá el email:
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'tu-email@ejemplo.com'
--  on conflict do nothing;
-- =====================================================================
