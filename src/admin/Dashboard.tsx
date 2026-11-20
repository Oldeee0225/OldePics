import { useState } from 'react'
import type { Album, Go, OpenAlbum } from '../types'
import { site } from '../data/site'
import { deleteAlbum, listAlbums, updateAlbum } from '../lib/api'
import { invalidateQueries, useQuery } from '../lib/useQuery'
import { publicUrl } from '../lib/supabase'
import { formatMonth } from '../lib/format'
import { Button } from '../components/Button'
import { Icon, type IconName } from '../components/Icon'
import { AdminShell } from './AdminShell'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 19 ? 'Good afternoon' : 'Good evening'
}

export function Dashboard({ go, email, openAlbum, editAlbum }: { go: Go; email?: string; openAlbum: OpenAlbum; editAlbum: OpenAlbum }) {
  const { data: albums = [], loading, error } = useQuery('admin:albums', () => listAlbums({ includeDrafts: true }))
  const [busyId, setBusyId] = useState<string | null>(null)

  const published = albums.filter(a => a.is_published).length
  const totalPhotos = albums.reduce((n, a) => n + a.photo_count, 0)
  const stats: [IconName, number, string][] = [
    ['image', totalPhotos, 'Photographs'],
    ['folder', albums.length, 'Albums'],
    ['eye', published, 'Published'],
    ['settings', albums.length - published, 'Drafts'],
  ]

  const run = async (a: Album, action: () => Promise<void>) => {
    setBusyId(a.id)
    try { await action(); invalidateQueries() }
    catch (e) { alert(e instanceof Error ? e.message : 'Something went wrong') }
    finally { setBusyId(null) }
  }
  const togglePublish = (a: Album) => run(a, () => updateAlbum(a.id, { is_published: !a.is_published }))
  const remove = (a: Album) => {
    if (!confirm(`Delete “${a.title}” and its ${a.photo_count} photos? This cannot be undone.`)) return
    run(a, () => deleteAlbum(a.id))
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <AdminShell page="admin" go={go} email={email}>
      <div className="admin-top">
        <div>
          <span>{today}</span>
          <h1>{greeting()}, {site.firstName}.</h1>
          <p>Manage your albums and what’s visible on the site.</p>
        </div>
        <Button onClick={() => go('upload')} icon="upload">New album</Button>
      </div>

      <div className="stats">
        {stats.map(([i, n, l]) => (
          <div key={l}>
            <span><Icon name={i}/></span>
            <strong>{n}</strong>
            <p>{l}</p>
          </div>
        ))}
      </div>

      <section className="admin-panel">
        <div className="panel-head">
          <div><h2>Albums</h2><p>Drafts are only visible to you</p></div>
        </div>

        {loading && <p className="admin-note">Loading…</p>}
        {error && <p className="form-error">{error.message}</p>}
        {!loading && !error && albums.length === 0 && (
          <div className="admin-empty">
            <p>You haven’t uploaded any albums yet.</p>
            <Button onClick={() => go('upload')} icon="upload">Upload your first album</Button>
          </div>
        )}

        <div className="album-list">
          {albums.map(a => (
            <div key={a.id} className={busyId === a.id ? 'is-busy' : ''}>
              {a.cover_thumb_path ? <img src={publicUrl(a.cover_thumb_path)} alt=""/> : <span className="thumb-ph"/>}
              <span>
                <b>{a.title} {a.is_protected && <Icon name="lock" size={11}/>}</b>
                <small>{[a.location, formatMonth(a.shot_on), `${a.photo_count} photos`].filter(Boolean).join(' · ')}</small>
              </span>
              <em className={a.is_published ? '' : 'draft'}>{a.is_published ? 'Published' : 'Draft'}</em>
              <div className="album-actions-admin">
                <button onClick={() => editAlbum(a.slug)}>Edit</button>
                <button onClick={() => openAlbum(a.slug)}>View</button>
                <button onClick={() => togglePublish(a)}>{a.is_published ? 'Unpublish' : 'Publish'}</button>
                <button className="danger" onClick={() => remove(a)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  )
}
