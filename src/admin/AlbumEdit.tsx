import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Go, Photo } from '../types'
import { deletePhoto, getAlbum, setAlbumPassword, updateAlbum } from '../lib/api'
import { publicUrl } from '../lib/supabase'
import { toItems, uploadItems, warnBeforeUnload, type UploadItem, type UploadStatus } from '../lib/upload'
import { invalidateQueries, useQuery } from '../lib/useQuery'
import { Button } from '../components/Button'
import { AdminShell } from './AdminShell'
import { AlbumPasswordField, CoverPreview, Dropzone, PhotoPickerGrid } from './UploadParts'
import { Icon } from '../components/Icon'

interface Props { go: Go; email?: string; slug: string | null; openAlbum: (slug: string) => void }

export function AlbumEdit({ go, email, slug, openAlbum }: Props) {
  const { data, loading, error } = useQuery(`album:${slug}`, () => (slug ? getAlbum(slug) : Promise.resolve(null)))
  const album = data?.album
  const photos = data?.photos ?? []

  const [form, setForm] = useState({ title: '', description: '', location: '', shot_on: '', is_published: false })
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [newItems, setNewItems] = useState<UploadItem[]>([])
  const [newPassword, setNewPassword] = useState('')

  // Rellena el formulario cuando llega el álbum
  useEffect(() => {
    if (album) setForm({
      title: album.title,
      description: album.description ?? '',
      location: album.location ?? '',
      shot_on: album.shot_on ?? '',
      is_published: album.is_published,
    })
  }, [album?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsRef = useRef(newItems)
  itemsRef.current = newItems
  useEffect(() => () => { itemsRef.current.forEach(i => URL.revokeObjectURL(i.preview)); warnBeforeUnload(false) }, [])

  if (!album) {
    return (
      <AdminShell page="admin" go={go} email={email}>
        <p className="admin-note">{loading ? 'Loading…' : error ? error.message : 'Album not found.'}</p>
      </AdminShell>
    )
  }

  const coverPhoto = photos.find(p => p.path === album.cover_path)

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    setMessage(label)
    try { await fn(); invalidateQueries(); setMessage('Saved.') }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Something went wrong') }
    finally { setBusy(false) }
  }

  const saveDetails = (e: FormEvent) => {
    e.preventDefault()
    act('Saving…', () => updateAlbum(album.id, {
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      shot_on: form.shot_on || null,
      is_published: form.is_published,
    }))
  }

  const savePassword = () =>
    act('Saving password…', async () => {
      await setAlbumPassword(album.id, newPassword.trim())
      setNewPassword('')
    })

  const setCover = (p: Photo) =>
    act('Updating cover…', () => updateAlbum(album.id, { cover_path: p.path, cover_thumb_path: p.thumb_path }))

  const removePhoto = (p: Photo) => {
    if (!confirm('Delete this photo from the album?')) return
    act('Deleting photo…', async () => {
      await deletePhoto(p)
      // si era la portada, pasa a la primera que quede
      if (p.path === album.cover_path) {
        const next = photos.find(x => x.id !== p.id)
        await updateAlbum(album.id, { cover_path: next?.path ?? null, cover_thumb_path: next?.thumb_path ?? null })
      }
    })
  }

  // ---- Añadir fotos al álbum existente ----
  const addFiles = (list: FileList) => {
    const { items, skipped } = toItems(list)
    if (skipped) setMessage(`${skipped} file(s) skipped (not an image or too large).`)
    setNewItems(prev => [...prev, ...items])
  }
  const setStatus = (id: string, status: UploadStatus, err?: string) =>
    setNewItems(prev => prev.map(i => (i.id === id ? { ...i, status, error: err } : i)))

  const uploadNew = async () => {
    setBusy(true)
    warnBeforeUnload(true)
    try {
      const startOrder = photos.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1
      const { failed } = await uploadItems(album.id, newItems, {
        startOrder,
        hasCover: !!album.cover_path,
        onStatus: setStatus,
        onProgress: (d, t) => setMessage(`Uploading photo ${Math.min(d + 1, t)} of ${t}…`),
      })
      newItems.forEach(i => URL.revokeObjectURL(i.preview))
      setNewItems([])
      invalidateQueries()
      setMessage(failed ? `${failed} photo(s) failed to upload.` : 'Photos added.')
    } finally {
      setBusy(false)
      warnBeforeUnload(false)
    }
  }

  const field = (key: 'title' | 'description' | 'location' | 'shot_on') => ({
    value: form[key],
    disabled: busy,
    onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <AdminShell page="admin" go={go} email={email}>
      <div className="admin-top">
        <div>
          <button className="back-admin" onClick={() => go('admin')}>← Albums</button>
          <h1>{album.title}</h1>
          <p>{photos.length} photos · {album.is_published ? 'Published' : 'Draft'}</p>
        </div>
        <Button variant="outline" onClick={() => openAlbum(album.slug)} icon="eye">View album</Button>
      </div>

      <div className="upload-layout">
        <section>
          <div className="panel-head edit-head">
            <div><h2>Photos</h2><p>Pick the cover or remove photos</p></div>
          </div>
          {photos.length === 0 && <p className="admin-note">This album has no photos yet.</p>}
          <PhotoPickerGrid
            photos={photos.map(p => ({ id: p.id, src: publicUrl(p.thumb_path) }))}
            coverId={coverPhoto?.id ?? null}
            onCover={id => { const p = photos.find(x => x.id === id); if (p) setCover(p) }}
            onRemove={id => { const p = photos.find(x => x.id === id); if (p) removePhoto(p) }}
            disabled={busy}
          />

          <div className="edit-add">
            <Dropzone onFiles={addFiles} disabled={busy} compact/>
            {newItems.length > 0 && (
              <>
                <PhotoPickerGrid
                  photos={newItems.map(i => ({ id: i.id, src: i.preview, status: i.status, error: i.error }))}
                  coverId={null}
                  onCover={() => {}}
                  onRemove={id => setNewItems(prev => prev.filter(i => i.id !== id))}
                  disabled
                />
                <div className="publish-actions">
                  <Button onClick={uploadNew} icon="upload">{busy ? 'Uploading…' : `Upload ${newItems.length} photo(s)`}</Button>
                </div>
              </>
            )}
          </div>
        </section>

        <form className="upload-details" onSubmit={saveDetails}>
          <CoverPreview src={album.cover_path ? publicUrl(album.cover_thumb_path ?? album.cover_path) : null}/>
          <h2>Album details</h2>
          <label>Title *<input required {...field('title')}/></label>
          <label>Description<textarea rows={3} {...field('description')}/></label>
          <label>Location<input {...field('location')}/></label>
          <label>Date<input type="date" {...field('shot_on')}/></label>
          <label className="toggle-row">
            <span><b>Published</b><small>Visible on the public site</small></span>
            <input type="checkbox" checked={form.is_published} disabled={busy}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}/>
          </label>
          {message && <p className="upload-message" role="status">{message}</p>}
          <div className="publish-actions">
            <button type="submit" className="btn btn-solid" disabled={busy}>Save changes</button>
          </div>

          <div className="password-box">
            <h3>Album password</h3>
            <p className={album.is_protected ? 'pw-status on' : 'pw-status off'}>
              <Icon name="lock" size={13}/> {album.is_protected ? 'Protected — visitors need the password' : 'Not protected — anyone can see the photos'}
            </p>
            <AlbumPasswordField
              value={newPassword}
              onChange={setNewPassword}
              disabled={busy}
              placeholder={album.is_protected ? 'New password' : 'Set a password'}
            />
            <button type="button" className="btn btn-outline" disabled={busy || newPassword.trim().length < 4} onClick={savePassword}>
              {album.is_protected ? 'Change password' : 'Protect album'}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  )
}
