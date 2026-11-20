-- =====================================================================
--  OldePics — álbumes con contraseña
--  Ejecutar una vez en Supabase → SQL Editor (se puede repetir sin problema).
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
