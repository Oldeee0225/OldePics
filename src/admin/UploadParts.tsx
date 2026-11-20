import { useRef, useState } from 'react'

/** Campo de contraseña del álbum, con botón para mostrarla y generar una. */
export function AlbumPasswordField({ value, onChange, disabled, required, placeholder }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; required?: boolean; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const generate = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    onChange(Array.from(bytes, b => chars[b % chars.length]).join(''))
    setShow(true)
  }
  return (
    <div className="album-password">
      <span className="pw-input">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          minLength={4}
          autoComplete="new-password"
          placeholder={placeholder ?? 'At least 4 characters'}
        />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name="eye" size={16}/>
        </button>
      </span>
      <button type="button" className="pw-generate" onClick={generate} disabled={disabled}>Generate</button>
    </div>
  )
}
import { MAX_MB, type UploadItem } from '../lib/upload'
import { Icon } from '../components/Icon'

/** Zona para soltar o elegir fotos. */
export function Dropzone({ onFiles, disabled, compact = false }: { onFiles: (f: FileList) => void; disabled?: boolean; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div
      className={`dropzone ${compact ? 'compact' : ''} ${disabled ? 'is-disabled' : ''}`}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); if (!disabled) onFiles(e.dataTransfer.files) }}
      onClick={() => !disabled && input.current?.click()}
    >
      <input ref={input} type="file" accept="image/*" multiple hidden
        onChange={e => { if (e.target.files) onFiles(e.target.files); e.target.value = '' }}/>
      <span><Icon name="upload" size={compact ? 20 : 26}/></span>
      <h3>{compact ? 'Add more photos' : 'Drop your photographs here'}</h3>
      <p>or <u>browse files</u> from your computer</p>
      {!compact && <small>JPEG or PNG · up to {MAX_MB} MB each</small>}
    </div>
  )
}

interface GridPhoto { id: string; src: string; status?: UploadItem['status']; error?: string }

/**
 * Cuadrícula de fotos con selector de portada.
 * Sirve para fotos locales (antes de subir) y para fotos ya subidas.
 */
export function PhotoPickerGrid({
  photos, coverId, onCover, onRemove, disabled,
}: {
  photos: GridPhoto[]
  coverId: string | null
  onCover: (id: string) => void
  onRemove?: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="upload-grid">
      {photos.map(p => {
        const isCover = coverId === p.id
        return (
          <div key={p.id} className={`upload-thumb ${p.status ?? ''} ${isCover ? 'is-cover' : ''}`}>
            <img src={p.src} alt="" loading="lazy"/>
            {isCover
              ? <span className="cover-badge"><Icon name="check" size={12}/> Cover</span>
              : !disabled && <button type="button" className="set-cover" onClick={() => onCover(p.id)}>Set as cover</button>}
            {p.status && p.status !== 'ready' && (
              <span className="thumb-status" title={p.error}>
                {p.status === 'done' ? <Icon name="check" size={14}/> : p.status === 'error' ? '!' : <i className="mini-loader"/>}
              </span>
            )}
            {onRemove && !disabled && (!p.status || p.status === 'ready') && (
              <button type="button" className="thumb-remove" onClick={() => onRemove(p.id)} aria-label="Remove photo">
                <Icon name="close" size={14}/>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Vista grande de la portada elegida (columna lateral). */
export function CoverPreview({ src }: { src: string | null }) {
  return (
    <div className="cover-preview">
      <span className="cover-label">Cover photo</span>
      {src
        ? <img src={src} alt="Selected cover"/>
        : <div className="cover-empty">Add photos and pick one as the cover</div>}
      <small>Click “Set as cover” on any photo to change it.</small>
    </div>
  )
}
