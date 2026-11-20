import type { Go, OpenAlbum } from '../types'
import { listAlbums } from '../lib/api'
import { useQuery } from '../lib/useQuery'
import { publicUrl } from '../lib/supabase'
import { formatMonth, pad2 } from '../lib/format'
import { EmptyState } from '../components/EmptyState'
import { Footer } from '../components/Footer'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { usePageMeta } from '../lib/meta'

export function Collections({ go, openAlbum }: { go: Go; openAlbum: OpenAlbum }) {
  usePageMeta('Collections', 'Photo albums by Oldemar Gonzalez, grouped by place, subject and a shared feeling.')
  const { data: albums = [], loading, error } = useQuery('albums', () => listAlbums())

  return (
    <div className="dark-page">
      <PageHeader go={go} eyebrow="Curated narratives" title={<>Collections & <em>albums</em></>}>
        <p>Photographic stories grouped by place, subject, and a shared feeling.</p>
      </PageHeader>

      {albums.length === 0 ? (
        <div className="section-pad page-empty">
          <EmptyState loading={loading} error={error} title="No albums yet." text="New albums will appear here as soon as they’re published."/>
        </div>
      ) : (
        <div className="albums section-pad">
          {albums.map((a, i) => (
            <button className="album-card" onClick={() => openAlbum(a.slug)} key={a.id}>
              <div className="album-image">
                {a.cover_path && <img src={publicUrl(a.cover_path)} alt="" loading="lazy"/>}
                <span>{pad2(i + 1)}</span>
                <i><Icon name="arrow"/></i>
                {a.is_protected && <b className="lock-badge"><Icon name="lock" size={12}/> Private</b>}
              </div>
              <div className="album-info">
                <span>{formatMonth(a.shot_on ?? a.created_at.slice(0, 10), true)}</span>
                <h2>{a.title}</h2>
                {a.description && <p>{a.description}</p>}
                <small>{a.photo_count} photographs</small>
              </div>
            </button>
          ))}
        </div>
      )}
      <Footer go={go}/>
    </div>
  )
}
