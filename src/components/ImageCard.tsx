import type { Photo } from '../types'
import { imageUrl } from '../lib/supabase'
import { orientation } from '../lib/format'
import { Icon } from './Icon'

export function ImageCard({ photo, open, label }: { photo: Photo; open: () => void; label?: string }) {
  return (
    <button className={`image-card ${orientation(photo)}`} onClick={open}>
      <img src={imageUrl(photo.thumb_path)} alt={photo.title ?? photo.album?.title ?? ''} loading="lazy"/>
      <span className="image-shade"/>
      <span className="image-meta">
        <small>{label ?? photo.album?.location ?? ''}</small>
        <strong>{photo.title ?? photo.album?.title}</strong>
        <i><Icon name="arrow"/></i>
      </span>
    </button>
  )
}
