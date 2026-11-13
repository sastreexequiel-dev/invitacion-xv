# Pruebas automáticas (opcionales)

Las usa el equipo de desarrollo; no hace falta correrlas para publicar la invitación.

```bash
cd testing && npm init -y && npm i embedded-postgres pg playwright
# 1) Esquema SQL en PostgreSQL real (19 pruebas)
node db.test.mjs ../supabase/schema.sql

# 2) De punta a punta: requiere los binarios de PostgREST y Supabase Auth (GoTrue) en ./bin
#    https://github.com/PostgREST/postgrest/releases  ·  https://github.com/supabase/auth/releases
node local-supabase.mjs ../supabase/schema.sql &      # levanta Postgres + GoTrue + PostgREST en :54321
# .env.local de la app apuntando a http://localhost:54321 con las claves de keys.json
cd .. && npm run build && npm start &
cd testing && node e2e.mjs                            # 25 pruebas en Chrome (iPhone 13)
```
