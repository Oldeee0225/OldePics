import type { Photo } from '../types'
import { updateAlbum, uploadPhoto } from './api'
import { prepareImage } from './image'

export type UploadStatus = 'ready' | 'processing' | 'uploading' | 'done' | 'error'

export interface UploadItem {
  id: string
  file: File
  preview: string          // URL local para previsualizar
  status: UploadStatus
  error?: string
}

export const MAX_MB = 40

/** Convierte una selección de archivos en items listos para subir. */
export function toItems(list: FileList | File[]): { items: UploadItem[]; skipped: number } {
  const files = Array.from(list)
  const ok = files.filter(f => f.type.startsWith('image/') && f.size < MAX_MB * 1024 * 1024)
  return {
    items: ok.map(file => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: 'ready' })),
    skipped: files.length - ok.length,
  }
}

interface Options {
  startOrder?: number
  coverId?: string | null          // item elegido como portada
  hasCover?: boolean               // el álbum ya tiene portada (al añadir fotos)
  onStatus: (id: string, status: UploadStatus, error?: string) => void
  onProgress?: (done: number, total: number) => void
}

/**
 * Sube los items uno a uno (redimensionar → subir → guardar fila).
 * La portada se guarda en cuanto su foto termina de subir, así el álbum
 * nunca queda sin portada aunque la subida se interrumpa después.
 */
export async function uploadItems(albumId: string, items: UploadItem[], opts: Options) {
  const { startOrder = 0, coverId = null, onStatus, onProgress } = opts
  let hasCover = opts.hasCover ?? false
  let coverIsFinal = false
  const uploaded: Photo[] = []
  let failed = 0

  for (const [i, item] of items.entries()) {
    onProgress?.(i, items.length)
    try {
      onStatus(item.id, 'processing')
      const prepared = await prepareImage(item.file)
      onStatus(item.id, 'uploading')
      const photo = await uploadPhoto(albumId, prepared, startOrder + i)
      uploaded.push(photo)
      onStatus(item.id, 'done')

      const isChosen = item.id === coverId
      if (isChosen || (!hasCover && !coverIsFinal)) {
        await updateAlbum(albumId, { cover_path: photo.path, cover_thumb_path: photo.thumb_path })
        hasCover = true
        if (isChosen) coverIsFinal = true
      }
    } catch (err) {
      failed++
      onStatus(item.id, 'error', err instanceof Error ? err.message : 'Upload failed')
    }
  }
  onProgress?.(items.length, items.length)
  return { uploaded, failed }
}

/** Mientras `active` sea true, el navegador avisa antes de cerrar o recargar la pestaña. */
export function warnBeforeUnload(active: boolean) {
  window.onbeforeunload = active ? (e: BeforeUnloadEvent) => { e.preventDefault(); return '' } : null
}
