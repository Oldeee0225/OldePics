// Fotos fijas de la página Gallery (además de las de álbumes públicos de Supabase).
// Origen: assets/2ndSection → optimizadas en public/img/featured (npm run images)
// Para añadir una: pon la foto en 2ndSection, ejecuta `npm run images` y agrégala aquí.
import type { Photo } from '../types'
import { featuredSrc } from './featured'

/**
 * Categorías de la Gallery (la lista desplegable del admin y los filtros
 * de la página pública). Para añadir, quitar o renombrar: edita esta lista.
 */
export const GALLERY_CATEGORIES = [
  'Nature',
  'Landscapes',
  'Flowers',
  'Wildlife',
  'Water',
  'Street',
  'Portraits',
  'Events',
  'Travel',
] as const

interface LocalPhoto {
  id: string                 // nombre del archivo original, sin extensión
  title: string
  width: number              // tamaño del original (para el visor)
  height: number
}

const local: LocalPhoto[] = [
  { id: '001', title: 'House by the lake', width: 3456, height: 5184 },
  { id: '002', title: 'Green hills', width: 3456, height: 5184 },
  { id: '005', title: 'Light on the rocks', width: 3456, height: 5184 },
  { id: '007', title: 'Small sprout', width: 3456, height: 5184 },
]

const album = { title: 'Nature', slug: 'nature', location: null, shot_on: null }

/** Las fotos locales con la misma forma que las de Supabase. */
export const galleryPhotos: Photo[] = local.map((p, i) => ({
  id: `local-${p.id}`,
  album_id: 'local',
  path: featuredSrc(p.id, 1600),
  thumb_path: featuredSrc(p.id, 800),
  title: p.title,
  width: p.width,
  height: p.height,
  sort_order: i,
  created_at: '2025-01-01T00:00:00Z',
  album,
}))
