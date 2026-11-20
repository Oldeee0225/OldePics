import { useEffect } from 'react'

// Textos de cada página. Los usa el navegador (título de la pestaña) y
// también api/page.ts en Vercel (vista previa al compartir el enlace).
// Si cambias algo aquí, cambia lo mismo en api/page.ts.
export const SITE_NAME = 'OldePics'
export const DEFAULT_DESCRIPTION = 'Flowers, mountains, gardens and quiet places. Learning to see, one photo at a time.'

/** Actualiza el título de la pestaña y la descripción de la página. */
export function usePageMeta(title: string | null | undefined, description?: string | null) {
  useEffect(() => {
    if (title === undefined) return
    document.title = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Photography by Oldemar Gonzalez`
    const tag = document.querySelector('meta[name="description"]')
    if (tag) tag.setAttribute('content', description || DEFAULT_DESCRIPTION)
  }, [title, description])
}
