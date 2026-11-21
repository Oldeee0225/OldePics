import { useEffect, useState, type FormEvent } from 'react'
import type { Album as AlbumT, Go, OpenPhoto, Photo } from '../types'
import { downloadPhotos, photoFileName } from '../lib/download'
import { getAlbum, WrongPasswordError } from '../lib/api'
import { useQuery } from '../lib/useQuery'
import { usePageMeta } from '../lib/meta'
import { publicUrl } from '../lib/supabase'
import { formatMonth } from '../lib/format'
import { copyLink } from '../utils/share'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { ImageCard } from '../components/ImageCard'

interface Props { go: Go; slug: string | null; openPhoto: OpenPhoto }

// La contraseña correcta se recuerda solo durante la sesión del navegador
const storeKey = (slug: string) => `album-pass:${slug}`
const readPass = (slug: string | null) => { try { return slug ? sessionStorage.getItem(storeKey(slug)) ?? '' : '' } catch { return '' } }
const savePass = (slug: string, v: string | null) => {
  try { if (v) sessionStorage.setItem(storeKey(slug), v); else sessionStorage.removeItem(storeKey(slug)) } catch { /* sin almacenamiento */ }
}

export function Album({ go, slug, openPhoto }: Props) {
  const [password, setPassword] = useState(() => readPass(slug))

  // 1) Datos del álbum (y sus fotos si no tiene contraseña o eres admin)
  const base = useQuery(`album:${slug}`, () => (slug ? getAlbum(slug) : Promise.resolve(null)))
  const needsPassword = !!base.data && base.data.photos === null
  usePageMeta(
    base.data ? base.data.album.title : base.loading ? undefined : 'Album not found',
    base.data?.album.description,
  )

  // 2) Si tiene contraseña: pedir las fotos con la contraseña escrita
  const tryKey = needsPassword && password ? `album:${slug}:unlock:${password}` : 'album:none'
  const unlocked = useQuery(tryKey, () =>
    needsPassword && password && slug ? getAlbum(slug, password) : Promise.resolve(null))
  const wrongPassword = unlocked.error instanceof WrongPasswordError

  // Contraseña incorrecta → se olvida y se vuelve a pedir
  if (wrongPassword && slug && readPass(slug) === password) savePass(slug, null)

  const data = base.data
  const loading = base.loading
  const error = base.error

  if (!data) {
    return (
      <div className="dark-page">
        <Header go={go}/>
        <div className="section-pad page-empty">
          <EmptyState loading={loading} error={error} title="Album not found.">
            <Button variant="outline" onClick={() => go('collections')}>← All collections</Button>
          </EmptyState>
        </div>
        <Footer go={go}/>
      </div>
    )
  }

  const album = data.album
  const photos = data.photos ?? unlocked.data?.photos ?? null
  const locked = photos === null

  const unlock = (value: string) => {
    if (slug) savePass(slug, value)
    setPassword(value)
  }

  return (
    <div className="dark-page">
      <Header go={go}/>
      <AlbumHero album={album} go={go}/>

      {locked ? (
        <PasswordGate
          key={password}
          checking={unlocked.loading}
          wrong={wrongPassword}
          onSubmit={unlock}
          title={album.title}
        />
      ) : (
        <AlbumPhotos album={album} photos={photos} openPhoto={openPhoto}/>
      )}
      <Footer go={go}/>
    </div>
  )
}

/** Acciones del álbum + cuadrícula con modo selección y descarga múltiple. */
function AlbumPhotos({ album, photos, openPhoto }: { album: AlbumT; photos: Photo[]; openPhoto: OpenPhoto }) {
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()) }

  // Esc sale del modo selección
  useEffect(() => {
    if (!selectMode) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) exitSelect() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectMode, busy])

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allSelected = selected.size === photos.length

  const download = async (list: Photo[]) => {
    if (busy || list.length === 0) return
    setError('')
    // nombres según la posición en el álbum: thanksgiving-001.jpg…
    const items = list.map(p => ({ photo: p, name: photoFileName(album.slug, photos.indexOf(p)) }))
    const zipName = list.length === photos.length ? album.slug : `${album.slug}-${list.length}-photos`
    try {
      await downloadPhotos(items, zipName, (done, total) => setProgress({ done, total }))
      if (selectMode) exitSelect()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed. Please try again.')
    } finally {
      setProgress(null)
    }
  }

  return (
    <>
      <div className="album-actions section-pad">
        <p>{album.description}</p>
        {photos.length > 0 && (
          <div>
            <Button variant="outline" onClick={() => copyLink('Album')} icon="share">Share</Button>
            {!selectMode && <Button variant="outline" onClick={() => setSelectMode(true)} icon="check">Select</Button>}
            <Button onClick={() => download(photos)} icon="download">
              {progress && !selectMode ? `Preparing ${progress.done}/${progress.total}…` : `Download all (${photos.length})`}
            </Button>
          </div>
        )}
      </div>
      {error && !selectMode && <p className="section-pad download-error" role="alert">{error}</p>}

      {photos.length === 0 ? (
        <div className="section-pad page-empty"><EmptyState title="This album has no photos yet."/></div>
      ) : (
        <div className={`masonry section-pad album-grid ${selectMode ? 'is-selecting' : ''}`}>
          {photos.map((p, i) => (
            <ImageCard
              key={p.id}
              photo={p}
              label={album.title}
              open={() => openPhoto(photos, i)}
              selectMode={selectMode}
              selected={selected.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>
      )}

      {selectMode && (
        <div className="select-bar" role="toolbar" aria-label="Selection">
          <div className="select-bar-inner">
            <span className="select-count">
              {progress ? `Preparing ${progress.done} of ${progress.total}…` : `${selected.size} selected`}
            </span>
            {error && <span className="select-error">{error}</span>}
            <div className="select-actions">
              <button type="button" onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map(p => p.id)))} disabled={busy}>
                {allSelected ? 'Clear' : 'Select all'}
              </button>
              <button
                type="button"
                className="select-download"
                disabled={busy || selected.size === 0}
                onClick={() => download(photos.filter(p => selected.has(p.id)))}
              >
                <Icon name="download" size={16}/> Download{selected.size ? ` (${selected.size})` : ''}
              </button>
              <button type="button" className="select-close" onClick={exitSelect} disabled={busy} aria-label="Cancel selection">
                <Icon name="close" size={18}/>
              </button>
            </div>
          </div>
          {progress && <i className="select-progress" style={{ ['--p' as string]: `${(progress.done / progress.total) * 100}%` }}/>}
        </div>
      )}
    </>
  )
}

function AlbumHero({ album, go }: { album: AlbumT; go: Go }) {
  const meta = [album.location, formatMonth(album.shot_on)].filter(Boolean).join(' · ')
  return (
    <section className="album-hero">
      {album.cover_path && <img src={publicUrl(album.cover_path)} alt=""/>}
      <div className="hero-shade"/>
      <div>
        <button className="back-link" onClick={() => go('collections')}>← All collections</button>
        {meta && <span className="eyebrow">{meta}</span>}
        <h1>{album.title}</h1>
        <span>{album.is_protected && <Icon name="lock" size={12}/>} {album.photo_count} photographs</span>
      </div>
    </section>
  )
}

function PasswordGate({ onSubmit, checking, wrong, title }: {
  onSubmit: (v: string) => void; checking: boolean; wrong: boolean; title?: string
}) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const submit = (e: FormEvent) => { e.preventDefault(); if (value.trim()) onSubmit(value) }

  return (
    <section className="album-gate section-pad">
      <span className="gate-icon"><Icon name="lock" size={22}/></span>
      <span className="eyebrow">Private album</span>
      <h2>This album is <em>protected.</em></h2>
      <p>Enter the password you received to see the photos{title ? ` of “${title}”` : ''}.</p>
      <form onSubmit={submit}>
        <span className="gate-field">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Album password"
            autoComplete="off"
            autoFocus
            aria-invalid={wrong}
          />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
            <Icon name="eye" size={18}/>
          </button>
        </span>
        <button type="submit" className="btn btn-solid" disabled={checking || !value.trim()}>
          {checking ? 'Checking…' : 'Unlock'} <Icon name="arrow" size={17}/>
        </button>
      </form>
      {wrong && <p className="gate-error" role="alert">That password isn’t right. Try again.</p>}
    </section>
  )
}
