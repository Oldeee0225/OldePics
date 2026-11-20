import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Si faltan las claves (.env.local), la web sigue funcionando con estados vacíos.
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const isSupabaseConfigured = supabase !== null

export const BUCKET = 'photos'

/** URL de una foto: rutas locales ('/img/...') tal cual; el resto, del bucket de Supabase */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('/') || path.startsWith('http')) return path
  return publicUrl(path)
}

/** URL pública de un archivo del bucket de fotos */
export function publicUrl(path: string | null | undefined): string {
  if (!path || !supabase) return ''
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
