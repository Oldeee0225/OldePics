import { useState, type FormEvent } from 'react'
import type { Album as AlbumT, Go, OpenPhoto } from '../types'
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
        <>
          <div className="album-actions section-pad">
            <p>{album.description}</p>
            <div>
              <Button variant="outline" onClick={() => copyLink('Album')} icon="share">Share album</Button>
            </div>
          </div>
          {photos.length === 0 ? (
            <div className="section-pad page-empty"><EmptyState title="This album has no photos yet."/></div>
          ) : (
            <div className="masonry section-pad album-grid">
              {photos.map((p, i) => <ImageCard key={p.id} photo={p} label={album.title} open={() => openPhoto(photos, i)}/>)}
            </div>
          )}
        </>
      )}
      <Footer go={go}/>
    </div>
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
