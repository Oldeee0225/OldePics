-- =====================================================================
--  OldePics — fotos sueltas de la Gallery (públicas, sin álbum)
--  Ejecutar una vez en Supabase → SQL Editor (se puede repetir sin problema).
-- =====================================================================

create table if not exists public.gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,                 -- versión grande (2400px) en el bucket "photos"
  thumb_path  text not null,                 -- miniatura (900px)
  title       text,
  category    text,                          -- filtro de la galería: Nature, Street…
  width       integer not null,
  height      integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists gallery_photos_created_idx on public.gallery_photos (created_at desc);

alter table public.gallery_photos enable row level security;

-- Visitantes: pueden verlas (son públicas)
drop policy if exists "public read gallery photos" on public.gallery_photos;
create policy "public read gallery photos" on public.gallery_photos
  for select using (true);

-- Admin (sesión iniciada): subir, editar y borrar
drop policy if exists "admin write gallery photos" on public.gallery_photos;
create policy "admin write gallery photos" on public.gallery_photos
  for all to authenticated using (true) with check (true);

-- Los archivos van al mismo bucket "photos" (carpeta gallery/), que ya
-- permite subir y borrar al admin con las políticas de schema.sql.
