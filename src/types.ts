export type Page = 'home' | 'gallery' | 'collections' | 'album' | 'about' | 'login' | 'admin' | 'upload' | 'edit'

export type Go = (page: Page) => void

/** Fila de la tabla `albums` (+ número de fotos) */
export interface Album {
  id: string
  slug: string
  title: string
  description: string | null
  location: string | null
  shot_on: string | null          // 'YYYY-MM-DD'
  cover_path: string | null
  cover_thumb_path: string | null
  is_published: boolean
  is_protected: boolean           // pide contraseña para ver las fotos
  sort_order: number
  created_at: string
  photo_count: number
}

/** Fila de la tabla `photos` (+ datos básicos de su álbum) */
export interface Photo {
  id: string
  album_id: string
  path: string
  thumb_path: string
  title: string | null
  width: number
  height: number
  sort_order: number
  created_at: string
  album?: Pick<Album, 'title' | 'slug' | 'location' | 'shot_on'>
}

export type OpenPhoto = (list: Photo[], index: number) => void
export type OpenAlbum = (slug: string) => void
