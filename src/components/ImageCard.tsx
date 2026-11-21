import type { Photo } from '../types'
import { imageUrl } from '../lib/supabase'
import { orientation } from '../lib/format'
import { Icon } from './Icon'

interface Props {
  photo: Photo
  open: () => void
  label?: string
  // Modo selección (álbumes): al tocar se marca/desmarca en vez de abrir
  selectMode?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function ImageCard({ photo, open, label, selectMode, selected, onToggle }: Props) {
  const cls = ['image-card', orientation(photo), selectMode && 'is-selectable', selected && 'is-selected']
    .filter(Boolean).join(' ')
  return (
    <button
      className={cls}
      onClick={selectMode ? onToggle : open}
      aria-pressed={selectMode ? !!selected : undefined}
    >
      <img src={imageUrl(photo.thumb_path)} alt={photo.title ?? photo.album?.title ?? ''} loading="lazy"/>
      <span className="image-shade"/>
      {selectMode
        ? <span className="select-check" aria-hidden="true">{selected && <Icon name="check" size={16}/>}</span>
        : (
          <span className="image-meta">
            <small>{label ?? photo.album?.location ?? ''}</small>
            <strong>{photo.title ?? photo.album?.title}</strong>
            <i><Icon name="arrow"/></i>
          </span>
        )}
    </button>
  )
}
