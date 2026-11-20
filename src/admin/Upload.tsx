import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Go } from '../types'
import { createAlbum, setAlbumPassword, updateAlbum } from '../lib/api'
import { toItems, uploadItems, warnBeforeUnload, type UploadItem, type UploadStatus } from '../lib/upload'
import { invalidateQueries } from '../lib/useQuery'
import { Icon } from '../components/Icon'
import { AdminShell } from './AdminShell'
import { AlbumPasswordField, CoverPreview, Dropzone, PhotoPickerGrid } from './UploadParts'

export function Upload({ go, email }: { go: Go; email?: string }) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [coverId, setCoverId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', location: '', shot_on: '', is_published: true })
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')

  // Libera las previsualizaciones al salir y quita el aviso de cierre
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => { itemsRef.current.forEach(i => URL.revokeObjectURL(i.preview)); warnBeforeUnload(false) }, [])

  const add = (list: FileList) => {
    const { items: next, skipped } = toItems(list)
    setMessage(skipped ? `${skipped} file(s) skipped (not an image or too large).` : '')
    setItems(prev => [...prev, ...next])
    if (!coverId && next[0]) setCoverId(next[0].id)
  }

  const removeItem = (id: string) => {
    const item = items.find(i => i.id === id)
    if (item) URL.revokeObjectURL(item.preview)
    const rest = items.filter(i => i.id !== id)
    setItems(rest)
    if (coverId === id) setCoverId(rest[0]?.id ?? null)
  }

  const setStatus = (id: string, status: UploadStatus, error?: string) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status, error } : i)))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return setMessage('Give the album a title.')
    if (items.length === 0) return setMessage('Add at least one photo.')
    if (password.trim().length < 4) return setMessage('Set a password of at least 4 characters.')
    setBusy(true)
    warnBeforeUnload(true)
    setMessage('Creating album…')
    try {
      // Se crea como borrador, se protege con la contraseña y solo entonces se publica:
      // así nunca queda visible sin contraseña.
      const album = await createAlbum({ ...form, is_published: false })
      await setAlbumPassword(album.id, password.trim())
      if (form.is_published) await updateAlbum(album.id, { is_published: true })
      const { failed } = await uploadItems(album.id, items, {
        coverId,
        onStatus: setStatus,
        onProgress: (done, total) => { setProgress(done / total); setMessage(`Uploading photo ${Math.min(done + 1, total)} of ${total}…`) },
      })
      invalidateQueries()
      if (failed) {
        setMessage(`Album created, but ${failed} photo(s) failed. Open it in “Edit” to add them again.`)
      } else {
        setMessage('Album uploaded!')
        setTimeout(() => go('admin'), 900)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not create the album')
    } finally {
      setBusy(false)
      warnBeforeUnload(false)
    }
  }

  const done = items.filter(i => i.status === 'done').length
  const cover = items.find(i => i.id === coverId)
  const field = (key: 'title' | 'description' | 'location' | 'shot_on') => ({
    value: form[key],
    disabled: busy,
    onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <AdminShell page="upload" go={go} email={email}>
      <div className="admin-top">
        <div>
          <button className="back-admin" onClick={() => go('admin')}>← Albums</button>
          <h1>New album</h1>
          <p>Upload a complete album. Photos are resized automatically before uploading.</p>
        </div>
      </div>

      <form className="upload-layout" onSubmit={submit}>
        <section>
          <Dropzone onFiles={add} disabled={busy} compact={items.length > 0}/>
          {items.length > 0 && (
            <>
              <div className="upload-summary">
                <span>{items.length} photos{busy || done ? ` · ${done} uploaded` : ''}</span>
                {busy && <i style={{ ['--p' as string]: `${progress * 100}%` }}/>}
              </div>
              <PhotoPickerGrid
                photos={items.map(i => ({ id: i.id, src: i.preview, status: i.status, error: i.error }))}
                coverId={coverId}
                onCover={setCoverId}
                onRemove={removeItem}
                disabled={busy}
              />
            </>
          )}
        </section>

        <aside className="upload-details">
          <CoverPreview src={cover?.preview ?? null}/>
          <h2>Album details</h2>
          <label>Title *<input required placeholder="e.g. Rainy season" {...field('title')}/></label>
          <label>Description<textarea rows={3} placeholder="A few words about this album…" {...field('description')}/></label>
          <label>Location<input placeholder="e.g. Boquete, Panamá" {...field('location')}/></label>
          <label>Date<input type="date" {...field('shot_on')}/></label>
          <label>Album password *
            <AlbumPasswordField value={password} onChange={setPassword} disabled={busy} required/>
            <small className="field-hint">Visitors need it to open the album. Share it with the people in the photos.</small>
          </label>
          <label className="toggle-row">
            <span><b>Publish now</b><small>If off, the album is saved as a draft</small></span>
            <input type="checkbox" checked={form.is_published} disabled={busy}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}/>
          </label>
          {message && <p className="upload-message" role="status">{message}</p>}
          {busy && <p className="upload-warning">Keep this tab open until the upload finishes.</p>}
          <div className="publish-actions">
            <button type="submit" className="btn btn-solid" disabled={busy}>
              {busy ? 'Uploading…' : 'Upload album'} <Icon name="upload" size={17}/>
            </button>
          </div>
        </aside>
      </form>
    </AdminShell>
  )
}
