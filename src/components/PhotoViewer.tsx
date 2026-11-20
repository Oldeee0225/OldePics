import { useEffect } from 'react'
import type { Photo } from '../types'
import { imageUrl } from '../lib/supabase'
import { formatMonth, pad2 } from '../lib/format'
import { copyLink } from '../utils/share'
import { Button } from './Button'
import { Icon } from './Icon'
import { Logo } from './Logo'

interface Props {
  photos: Photo[]            // la lista desde la que se abrió (álbum o galería)
  index: number
  setIndex: (i: number) => void
  close: () => void
}

export function PhotoViewer({ photos, index, setIndex, close }: Props) {
  const p = photos[index]
  const nav = (n: number) => setIndex((index + n + photos.length) % photos.length)

  // Bloquea el scroll de la página de fondo mientras el visor está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Teclado: Esc cierra, ← → navegan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') nav(-1)
      if (e.key === 'ArrowRight') nav(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!p) return null
  const title = p.title ?? p.album?.title ?? 'Untitled'
  const src = imageUrl(p.path)

  const download = async () => {
    // fetch + blob para que descargue en vez de abrir otra pestaña
    try {
      const blob = await fetch(src).then(r => r.blob())
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${(p.album?.slug ?? 'oldepics')}-${pad2(index + 1)}.jpg`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(src, '_blank')
    }
  }

  const related = photos.filter((_, i) => i !== index).slice(0, 3)

  return (
    <div className="viewer">
      <div className="viewer-top">
        <Logo onClick={close}/>
        <span>{pad2(index + 1)} / {pad2(photos.length)}</span>
        <button onClick={close}><Icon name="close" size={26}/> Close</button>
      </div>

      <div className="viewer-stage">
        {photos.length > 1 && <button className="viewer-nav prev" onClick={() => nav(-1)} aria-label="Previous">←</button>}
        <img src={src} alt={title} width={p.width} height={p.height}/>
        {photos.length > 1 && <button className="viewer-nav next" onClick={() => nav(1)} aria-label="Next">→</button>}
      </div>

      <aside className="viewer-info">
        <div>
          <span className="eyebrow">{[p.album?.title, formatMonth(p.album?.shot_on)].filter(Boolean).join(' · ')}</span>
          <h1>{title}</h1>
        </div>
        <dl>
          {p.album?.location && <div><dt>Location</dt><dd>{p.album.location}</dd></div>}
          <div><dt>Original size</dt><dd>{p.width} × {p.height}</dd></div>
          <div><dt>Format</dt><dd>JPEG</dd></div>
          <div><dt>License</dt><dd>Personal use</dd></div>
        </dl>
        <div className="viewer-actions">
          <Button onClick={download} icon="download">Download</Button>
          <Button variant="outline" onClick={() => copyLink('Photo')} icon="share">Share</Button>
        </div>
      </aside>

      {related.length > 0 && (
        <section className="viewer-related">
          <span className="eyebrow">Continue exploring</span>
          <h2>More from this set</h2>
          <div>
            {related.map(x => (
              <button key={x.id} onClick={() => setIndex(photos.indexOf(x))}>
                <img src={imageUrl(x.thumb_path)} alt="" loading="lazy"/>
                <span>{x.title ?? x.album?.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
