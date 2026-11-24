-- =====================================================================
--  OldePics — esquema de base de datos
--  Pegar completo en Supabase → SQL Editor → Run (se puede ejecutar
--  varias veces sin romper nada).
-- =====================================================================

-- ---------- Álbumes ----------
create table if not exists public.albums (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  description      text,
  location         text,
  shot_on          date,                       -- fecha de la sesión
  cover_path       text,                       -- ruta en Storage de la foto de portada (grande)
  cover_thumb_path text,                       -- ruta en Storage de la portada (miniatura)
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------- Fotos ----------
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums(id) on delete cascade,
  path        text not null,                   -- versión grande (2400px)
  thumb_path  text not null,                   -- miniatura (900px)
  title       text,
  width       integer not null,
  height      integer not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists photos_album_idx on public.photos (album_id, sort_order);

-- ---------- Seguridad (RLS) ----------
-- Visitantes: solo leen álbumes publicados y sus fotos.
-- Usuario autenticado (tú, en el admin): puede todo.
alter table public.albums enable row level security;
alter table public.photos enable row level security;

drop policy if exists "public read published albums" on public.albums;
create policy "public read published albums" on public.albums
  for select using (is_published or auth.role() = 'authenticated');

drop policy if exists "admin write albums" on public.albums;
create policy "admin write albums" on public.albums
  for all to authenticated using (true) with check (true);

drop policy if exists "public read photos of published albums" on public.photos;
create policy "public read photos of published albums" on public.photos
  for select using (
    auth.role() = 'authenticated'
    or exists (select 1 from public.albums a where a.id = album_id and a.is_published)
  );

drop policy if exists "admin write photos" on public.photos;
create policy "admin write photos" on public.photos
  for all to authenticated using (true) with check (true);

-- ---------- Storage: bucket público "photos" ----------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- El bucket es público: las imágenes se sirven por su URL sin necesitar
-- política SELECT. Solo el admin puede LISTAR archivos (para borrar álbumes).
drop policy if exists "public read photos bucket" on storage.objects;
drop policy if exists "admin read photos bucket" on storage.objects;
create policy "admin read photos bucket" on storage.objects
  for select to authenticated using (bucket_id = 'photos');

drop policy if exists "admin upload photos bucket" on storage.objects;
create policy "admin upload photos bucket" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists "admin update photos bucket" on storage.objects;
create policy "admin update photos bucket" on storage.objects
  for update to authenticated using (bucket_id = 'photos');

drop policy if exists "admin delete photos bucket" on storage.objects;
create policy "admin delete photos bucket" on storage.objects
  for delete to authenticated using (bucket_id = 'photos');

-- =====================================================================
--  Álbumes con contraseña (también disponible por separado en album-passwords.sql)
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ¿El álbum pide contraseña? (público; la contraseña NO se guarda aquí)
alter table public.albums add column if not exists is_protected boolean not null default false;

-- Nº de fotos guardado en el álbum (los visitantes no pueden contar las fotos
-- de un álbum protegido, así que lo mantenemos con un trigger).
alter table public.albums add column if not exists photo_count integer not null default 0;

create or replace function public.refresh_album_photo_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update albums a set photo_count = (select count(*) from photos p where p.album_id = a.id)
  where a.id = coalesce(new.album_id, old.album_id);
  return null;
end $$;

drop trigger if exists photos_count_trigger on public.photos;
create trigger photos_count_trigger
  after insert or delete on public.photos
  for each row execute function public.refresh_album_photo_count();

update public.albums a set photo_count = (select count(*) from public.photos p where p.album_id = a.id);

-- ---------- Contraseñas (cifradas con bcrypt) ----------
-- Tabla sin políticas RLS: nadie puede leerla desde el navegador.
create table if not exists public.album_secrets (
  album_id      uuid primary key references public.albums(id) on delete cascade,
  password_hash text not null
);
alter table public.album_secrets enable row level security;
revoke all on public.album_secrets from anon, authenticated;

-- Admin: poner / cambiar / quitar la contraseña de un álbum
create or replace function public.set_album_password(p_album_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.role() <> 'authenticated' then
    raise exception 'not allowed';
  end if;
  if p_password is null or length(trim(p_password)) = 0 then
    delete from album_secrets where album_id = p_album_id;
    update albums set is_protected = false where id = p_album_id;
  else
    insert into album_secrets (album_id, password_hash)
    values (p_album_id, crypt(p_password, gen_salt('bf', 10)))
    on conflict (album_id) do update set password_hash = excluded.password_hash;
    update albums set is_protected = true where id = p_album_id;
  end if;
end $$;

revoke execute on function public.set_album_password(uuid, text) from public, anon;
grant execute on function public.set_album_password(uuid, text) to authenticated;

-- Visitantes: obtener las fotos de un álbum dando su contraseña
create or replace function public.get_album_photos(p_slug text, p_password text)
returns setof public.photos language plpgsql stable security definer set search_path = public, extensions as $$
declare
  a record;
  h text;
begin
  select id, is_published, is_protected into a from albums where slug = p_slug;
  if not found or (not a.is_published and auth.role() <> 'authenticated') then
    raise exception 'album_not_found';
  end if;
  if a.is_protected and auth.role() <> 'authenticated' then
    select password_hash into h from album_secrets where album_id = a.id;
    if h is null or p_password is null or crypt(p_password, h) <> h then
      raise exception 'invalid_password';
    end if;
  end if;
  return query select * from photos where album_id = a.id order by sort_order;
end $$;

grant execute on function public.get_album_photos(text, text) to anon, authenticated;

-- ---------- Fotos: los visitantes solo leen directamente las de álbumes SIN contraseña ----------
drop policy if exists "public read photos of published albums" on public.photos;
create policy "public read photos of published albums" on public.photos
  for select using (
    auth.role() = 'authenticated'
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.is_published and not a.is_protected
    )
  );

-- =====================================================================
--  Fotos sueltas de la Gallery (también por separado en gallery.sql)
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
