import type { Page } from '../types'

// Dirección (URL) de cada página
export const PATHS: Record<Page, string> = {
  home: '/',
  gallery: '/gallery',
  collections: '/collections',
  album: '/collections',
  about: '/about',
  login: '/login',
  admin: '/admin',
  upload: '/admin/new',
  edit: '/admin',
  adminGallery: '/admin/gallery',
}

export const albumPath = (slug: string) => `/albums/${slug}`
