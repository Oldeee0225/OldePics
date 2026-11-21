import { zipSync, type Zippable } from 'fflate'
import type { Photo } from '../types'
import { imageUrl } from './supabase'

/** Guarda un Blob como archivo en el dispositivo del visitante. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // pequeña espera: algunos navegadores (Safari) necesitan la URL viva un momento
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

interface Item { photo: Photo; name: string }

/**
 * Descarga varias fotos (versión grande).
 * - 1 foto → se guarda directamente como .jpg
 * - varias → un único .zip (sin recomprimir: las JPG ya están comprimidas)
 * Descarga 4 a la vez y avisa del progreso con onProgress(hechas, total).
 */
export async function downloadPhotos(
  items: Item[],
  zipName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (items.length === 0) return
  const fetchBytes = async (p: Photo) => {
    const res = await fetch(imageUrl(p.path))
    if (!res.ok) throw new Error(`Could not download a photo (${res.status})`)
    return new Uint8Array(await res.arrayBuffer())
  }

  if (items.length === 1) {
    onProgress?.(0, 1)
    const bytes = await fetchBytes(items[0].photo)
    onProgress?.(1, 1)
    saveBlob(new Blob([bytes], { type: 'image/jpeg' }), items[0].name)
    return
  }

  const files: Zippable = {}
  let done = 0
  let next = 0
  onProgress?.(0, items.length)

  const worker = async () => {
    while (next < items.length) {
      const item = items[next++]
      files[item.name] = [await fetchBytes(item.photo), { level: 0 }]
      onProgress?.(++done, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker))

  const zipped = zipSync(files)
  saveBlob(new Blob([zipped], { type: 'application/zip' }), `${zipName}.zip`)
}

/** Nombre de archivo de una foto dentro de un álbum: thanksgiving-007.jpg */
export const photoFileName = (albumSlug: string, index: number) =>
  `${albumSlug}-${String(index + 1).padStart(3, '0')}.jpg`
