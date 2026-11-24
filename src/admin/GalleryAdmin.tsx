import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { GalleryPhoto, Go } from '../types'
import { deleteGalleryPhoto, listGalleryPhotos, updateGalleryPhoto } from '../lib/api'
import { publicUrl } from '../lib/supabase'
import { makePreviews, toItems, uploadGalleryItems, warnBeforeUnload, type UploadItem, type UploadStatus } from '../lib/upload'
import { invalidateQueries, useQuery } from '../lib/useQuery'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { AdminShell } from './AdminShell'
import { Dropzone, PhotoPickerGrid } from './UploadParts'
import { GALLERY_CATEGORIES } from '../data/gallery'

export function GalleryAdmin({ go, email }: { go: Go; email?: string }) {
  const { data: photos = [], loading, error } = useQuery('admin:gallery', listGalleryPhotos)
  const [items, setItems] = useState<UploadItem[]>([])
  const [meta, setMeta] = useState({ category: '', title: '' })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')

  // Lista fija + cualquier categoría antigua que ya tenga alguna foto (para no perderla)
  const categories = useMemo(() => {
    const fixed: string[] = [...GALLERY_CATEGORIES]
    const extra = photos.map(p => p.category).filter((c): c is string => !!c && !fixed.includes(c))
    return [...fixed, ...new Set(extra)]
  }, [photos])

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => { itemsRef.current.forEach(i => URL.revokeObjectURL(i.preview)); warnBeforeUnload(false) }, [])

  const add = (list: FileList) => {
    const { items: next, skipped } = toItems(list)
    setMessage(skipped ? `${skipped} file(s) skipped (not an image or too large).` : '')
    setItems(prev => [...prev, ...next])
    makePreviews(next, (id, url) => setItems(prev => prev.map(i => (i.id === id ? { ...i, preview: url } : i))))
  }
  const remove = (id: string) => {
    const item = items.find(i => i.id === id)
    if (item) URL.revokeObjectURL(item.preview)
    setItems(prev => prev.filter(i => i.id !== id))
  }
  const setStatus = (id: string, status: UploadStatus, err?: string) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status, error: err } : i)))

  const upload = async (e: FormEvent) => {
    e.preventDefault()
    const pending = items.filter(i => i.status !== 'done')
    if (pending.length === 0) return setMessage('Add some photos first.')
    setBusy(true)
    warnBeforeUnload(true)
    try {
      const { failed } = await uploadGalleryItems(pending, meta, {
        onStatus: setStatus,
        onProgress: (d, t) => { setProgress(d / t); setMessage(`Uploading photo ${Math.min(d + 1, t)} of ${t}…`) },
      })
      invalidateQueries()
      if (failed) {
        setMessage(`${pending.length - failed} uploaded, ${failed} failed (marked in red). Press Upload again to retry them.`)
        // quita de la lista las que ya subieron; deja las fallidas para reintentar
        setItems(prev => prev.filter(i => i.status !== 'done').map(i => ({ ...i, status: 'ready' as UploadStatus })))
      } else {
        setMessage(`${pending.length} photo(s) added to the gallery.`)
        items.forEach(i => URL.revokeObjectURL(i.preview))
        setItems([])
      }
    } finally {
      setBusy(false)
      setProgress(0)
      warnBeforeUnload(false)
    }
  }

  const done = items.filter(i => i.status === 'done').length

  return (
    <AdminShell page="adminGallery" go={go} email={email}>
      <div className="admin-top">
        <div>
          <button className="back-admin" onClick={() => go('admin')}>← Albums</button>
          <h1>Gallery</h1>
          <p>Single photos, public for everyone on the Gallery page. You can upload many at once.</p>
        </div>
        <Button variant="outline" onClick={() => go('gallery')} icon="eye">View gallery</Button>
      </div>

      <form className="upload-layout" onSubmit={upload}>
        <section>
          <Dropzone onFiles={add} disabled={busy} compact={items.length > 0}/>
          {items.length > 0 && (
            <>
              <div className="upload-summary">
                <span>{items.length} photos ready{busy || done ? ` · ${done} uploaded` : ''}</span>
                {busy && <i style={{ ['--p' as string]: `${progress * 100}%` }}/>}
              </div>
              <PhotoPickerGrid
                photos={items.map(i => ({ id: i.id, src: i.preview, status: i.status, error: i.error }))}
                coverId={null}
                onCover={() => {}}
                onRemove={remove}
                disabled={busy}
                pickCover={false}
              />
            </>
          )}
        </section>

        <aside className="upload-details">
          <h2>Upload details</h2>
          <label>Category
            <CategorySelect value={meta.category} options={categories} disabled={busy}
              onChange={category => setMeta(m => ({ ...m, category }))}/>
            <small className="field-hint">Used as a filter on the Gallery page. Applies to all photos in this upload.</small>
          </label>
          <label>Title (optional)
            <input
              placeholder="Same title for all, or leave empty"
              value={meta.title}
              disabled={busy}
              onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
            />
            <small className="field-hint">You can give each photo its own title later, below.</small>
          </label>
          {message && <p className="upload-message" role="status">{message}</p>}
          {busy && <p className="upload-warning">Keep this tab open until the upload finishes.</p>}
          <div className="publish-actions">
            <button type="submit" className="btn btn-solid" disabled={busy || items.length === 0}>
              {busy ? 'Uploading…' : `Upload ${items.length || ''} to gallery`} <Icon name="upload" size={17}/>
            </button>
          </div>
        </aside>
      </form>

      <section className="admin-panel gallery-panel">
        <div className="panel-head">
          <div><h2>In the gallery</h2><p>{photos.length} photos · newest first · changes save automatically</p></div>
        </div>
        {loading && <p className="admin-note">Loading…</p>}
        {error && <p className="form-error">{error.message}</p>}
        {!loading && !error && photos.length === 0 && <p className="admin-note">No photos uploaded to the gallery yet.</p>}
        <div className="gallery-admin-grid">
          {photos.map(p => <GalleryRow key={p.id} photo={p} categories={categories}/>)}
        </div>
      </section>
    </AdminShell>
  )
}

/** Una foto ya subida: miniatura + título y categoría editables + borrar. */
function GalleryRow({ photo, categories }: { photo: GalleryPhoto; categories: string[] }) {
  const [title, setTitle] = useState(photo.title ?? '')
  const [category, setCategory] = useState(photo.category ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Guarda título y categoría (la lista guarda al elegir; el título al salir del campo)
  const save = async (nextCategory = category) => {
    const patch = { title: title.trim() || null, category: nextCategory.trim() || null }
    if (patch.title === photo.title && patch.category === photo.category) return
    setState('saving')
    try { await updateGalleryPhoto(photo.id, patch); setState('saved'); invalidateQueries() }
    catch { setState('error') }
  }

  const remove = async () => {
    if (!confirm('Delete this photo from the gallery?')) return
    setState('saving')
    try { await deleteGalleryPhoto(photo); invalidateQueries() }
    catch (e) { setState('error'); alert(e instanceof Error ? e.message : 'Could not delete') }
  }

  return (
    <div className={`gallery-row ${state === 'saving' ? 'is-busy' : ''}`}>
      <img src={publicUrl(photo.thumb_path)} alt="" loading="lazy"/>
      <div className="gallery-row-fields">
        <input value={title} placeholder="Title" onChange={e => setTitle(e.target.value)} onBlur={() => save()}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} aria-label="Title"/>
        <CategorySelect value={category} options={categories} ariaLabel="Category"
          onChange={c => { setCategory(c); save(c) }}/>
      </div>
      <div className="gallery-row-actions">
        {state === 'saved' && <span className="row-saved"><Icon name="check" size={12}/> Saved</span>}
        {state === 'error' && <span className="row-error">Error</span>}
        <button type="button" className="danger" onClick={remove} aria-label="Delete photo"><Icon name="close" size={14}/></button>
      </div>
    </div>
  )
}

/** Lista desplegable de categorías (con opción "sin categoría"). */
function CategorySelect({ value, options, onChange, disabled, ariaLabel }: {
  value: string
  options: string[]
  onChange: (v: string) => void
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} aria-label={ariaLabel}>
      <option value="">— No category —</option>
      {options.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )
}
