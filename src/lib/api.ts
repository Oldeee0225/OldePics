import { BUCKET, supabase } from './supabase'
import type { Album, Photo } from '../types'

// ---------------------------------------------------------------------
//  Lectura (web pública y admin)
// ---------------------------------------------------------------------

type AlbumRow = Album & { first?: { path: string; thumb_path: string }[] }
// Si el álbum no tiene portada, usa su primera foto (solo visible si no tiene contraseña)
const withCover = (row: AlbumRow): Album => {
  const { first, ...album } = row
  return {
    ...album,
    cover_path: album.cover_path ?? first?.[0]?.path ?? null,
    cover_thumb_path: album.cover_thumb_path ?? first?.[0]?.thumb_path ?? null,
  }
}

/** Álbumes ordenados. Por defecto solo los publicados. */
export async function listAlbums({ includeDrafts = false } = {}): Promise<Album[]> {
  if (!supabase) return []
  let q = supabase
    .from('albums')
    .select('*, first:photos(path, thumb_path)')
    .order('sort_order', { referencedTable: 'first', ascending: true })
    .limit(1, { referencedTable: 'first' })
    .order('sort_order', { ascending: true })
    .order('shot_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (!includeDrafts) q = q.eq('is_published', true)
  const { data, error } = await q
  if (error) throw error
  return (data as AlbumRow[]).map(withCover)
}

export class WrongPasswordError extends Error {
  constructor() { super('Wrong password') }
}

/**
 * Un álbum por su slug, con sus fotos en orden.
 * - Álbum sin contraseña, o admin con sesión: devuelve las fotos.
 * - Álbum con contraseña y visitante: `photos` es null hasta que se da la contraseña
 *   correcta (la comprueba la base de datos; si falla lanza WrongPasswordError).
 */
export async function getAlbum(slug: string, password?: string): Promise<{ album: Album; photos: Photo[] | null } | null> {
  if (!supabase) return null
  const { data: album, error } = await supabase.from('albums').select('*').eq('slug', slug).maybeSingle<Album>()
  if (error) throw error
  if (!album) return null

  const { data: { session } } = await supabase.auth.getSession()
  let photos: Photo[] | null

  if (album.is_protected && !session) {
    if (!password) {
      photos = null
    } else {
      const res = await supabase.rpc('get_album_photos', { p_slug: slug, p_password: password })
      if (res.error) {
        if (res.error.message.includes('invalid_password')) throw new WrongPasswordError()
        throw res.error
      }
      photos = res.data as Photo[]
    }
  } else {
    const res = await supabase.from('photos').select('*').eq('album_id', album.id).order('sort_order')
    if (res.error) throw res.error
    photos = res.data as Photo[]
  }

  const meta = { title: album.title, slug: album.slug, location: album.location, shot_on: album.shot_on }
  return {
    album: {
      ...album,
      cover_path: album.cover_path ?? photos?.[0]?.path ?? null,
      cover_thumb_path: album.cover_thumb_path ?? photos?.[0]?.thumb_path ?? null,
    },
    photos: photos?.map(p => ({ ...p, album: meta })) ?? null,
  }
}

/** Admin: poner, cambiar o quitar (cadena vacía) la contraseña de un álbum. */
export async function setAlbumPassword(albumId: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.rpc('set_album_password', { p_album_id: albumId, p_password: password })
  if (error) throw error
}

/** Todas las fotos de álbumes publicados (galería y búsqueda), más recientes primero. */
export async function listPhotos(): Promise<Photo[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('photos')
    .select('*, album:albums!inner(title, slug, location, shot_on, is_published)')
    .eq('album.is_published', true)
    .order('created_at', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as Photo[]
}

// ---------------------------------------------------------------------
//  Escritura (solo admin autenticado; lo garantiza RLS en Supabase)
// ---------------------------------------------------------------------

export function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita acentos
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'album'
}

export interface NewAlbum {
  title: string
  description?: string
  location?: string
  shot_on?: string
  is_published: boolean
}

export async function createAlbum(input: NewAlbum): Promise<Album> {
  if (!supabase) throw new Error('Supabase is not configured')
  // slug único: si ya existe, añade un sufijo corto
  let slug = slugify(input.title)
  const { data: existing } = await supabase.from('albums').select('slug').eq('slug', slug).maybeSingle()
  if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const { data, error } = await supabase
    .from('albums')
    .insert({
      slug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      shot_on: input.shot_on || null,
      is_published: input.is_published,
    })
    .select()
    .single()
  if (error) throw error
  return { ...(data as Omit<Album, 'photo_count'>), photo_count: 0 }
}

export async function updateAlbum(id: string, patch: Partial<Omit<Album, 'id' | 'photo_count'>>) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('albums').update(patch).eq('id', id)
  if (error) throw error
}

/** Sube las dos versiones de una foto a Storage y crea su fila. */
export async function uploadPhoto(
  albumId: string,
  files: { full: Blob; thumb: Blob; width: number; height: number },
  sortOrder: number,
): Promise<Photo> {
  if (!supabase) throw new Error('Supabase is not configured')
  const name = crypto.randomUUID()
  const path = `albums/${albumId}/${name}.jpg`
  const thumbPath = `albums/${albumId}/${name}-thumb.jpg`
  const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }

  const up1 = await supabase.storage.from(BUCKET).upload(path, files.full, opts)
  if (up1.error) throw up1.error
  const up2 = await supabase.storage.from(BUCKET).upload(thumbPath, files.thumb, opts)
  if (up2.error) throw up2.error

  const { data, error } = await supabase
    .from('photos')
    .insert({ album_id: albumId, path, thumb_path: thumbPath, width: files.width, height: files.height, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data as Photo
}

/** Borra una foto (archivos + fila). */
export async function deletePhoto(photo: Pick<Photo, 'id' | 'path' | 'thumb_path'>) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error: e1 } = await supabase.storage.from(BUCKET).remove([photo.path, photo.thumb_path])
  if (e1) throw e1
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
}

/** Borra un álbum, sus fotos (cascade) y sus archivos en Storage. */
export async function deleteAlbum(id: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: files } = await supabase.storage.from(BUCKET).list(`albums/${id}`, { limit: 1000 })
  if (files?.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(files.map(f => `albums/${id}/${f.name}`))
    if (error) throw error
  }
  const { error } = await supabase.from('albums').delete().eq('id', id)
  if (error) throw error
}
