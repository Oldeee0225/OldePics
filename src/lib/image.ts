// Redimensiona una foto en el navegador antes de subirla.
// Así no se suben originales de 5–10 MB a Supabase (plan gratis: 1 GB).

export const FULL_SIZE = 2400   // lado largo de la versión grande
export const THUMB_SIZE = 900   // lado largo de la miniatura

async function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  )
}

export async function prepareImage(file: File) {
  // imageOrientation respeta la rotación EXIF de la cámara/móvil
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const full = await toJpeg(bitmap, FULL_SIZE, 0.85)
    const thumb = await toJpeg(bitmap, THUMB_SIZE, 0.8)
    return { full, thumb, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}
