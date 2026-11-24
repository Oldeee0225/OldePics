import type { Photo } from '../types'
import { updateAlbum, uploadGalleryPhoto, uploadPhoto } from './api'
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

/**
 * Convierte una selección de archivos en items listos para subir.
 * `preview` empieza vacío: llama a makePreviews() para generar miniaturas ligeras.
 */
export function toItems(list: FileList | File[]): { items: UploadItem[]; skipped: number } {
  const files = Array.from(list)
  const ok = files.filter(f => f.type.startsWith('image/') && f.size < MAX_MB * 1024 * 1024)
  return {
    items: ok.map(file => ({ id: crypto.randomUUID(), file, preview: '', status: 'ready' })),
    skipped: files.length - ok.length,
  }
}

/**
 * Genera miniaturas pequeñas (360px) de una en una, en segundo plano.
 * Así la página no tiene que mostrar 100 originales de 10 MB (lo que puede
 * colgar el navegador, sobre todo en móviles). Llama a onReady por cada una.
 */
export async function makePreviews(items: UploadItem[], onReady: (id: string, url: string) => void) {
  for (const item of items) {
    try {
      const bitmap = await createImageBitmap(item.file, { imageOrientation: 'from-image' })
      const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.75))
      if (blob) onReady(item.id, URL.createObjectURL(blob))
    } catch {
      // formato que el navegador no puede leer: se queda sin miniatura (y fallará al subir)
    }
  }
}

/** Sube varias fotos sueltas a la Gallery (una a una), con el mismo título/categoría opcional. */
export async function uploadGalleryItems(
  items: UploadItem[],
  meta: { title?: string; category?: string },
  opts: Pick<Options, 'onStatus' | 'onProgress'>,
) {
  let failed = 0
  for (const [i, item] of items.entries()) {
    opts.onProgress?.(i, items.length)
    try {
      opts.onStatus(item.id, 'processing')
      const prepared = await prepareImage(item.file)
      opts.onStatus(item.id, 'uploading')
      await uploadGalleryPhoto(prepared, meta)
      opts.onStatus(item.id, 'done')
    } catch (err) {
      failed++
      opts.onStatus(item.id, 'error', err instanceof Error ? err.message : 'Upload failed')
    }
  }
  opts.onProgress?.(items.length, items.length)
  return { failed }
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
