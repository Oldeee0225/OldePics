import { useMemo, useState } from 'react'
import type { Go, OpenPhoto } from '../types'
import { listPhotos } from '../lib/api'
import { galleryPhotos } from '../data/gallery'
import { useQuery } from '../lib/useQuery'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { Footer } from '../components/Footer'
import { Icon } from '../components/Icon'
import { ImageCard } from '../components/ImageCard'
import { PageHeader } from '../components/PageHeader'
import { usePageMeta } from '../lib/meta'

const PAGE = 12
type Sort = 'newest' | 'oldest' | 'album'

interface Props { go: Go; openPhoto: OpenPhoto }

export function Gallery({ go, openPhoto }: Props) {
  usePageMeta('Gallery', 'Places, people and moments collected over time — photography by Oldemar Gonzalez.')
  // Fotos fijas del proyecto primero y luego las de álbumes públicos de Supabase
  const { data: photos = [], loading, error } = useQuery('photos', async () => [...galleryPhotos, ...await listPhotos()])
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [limit, setLimit] = useState(PAGE)

  // Filtros = los álbumes que tienen fotos
  const albumNames = useMemo(() => ['All', ...new Set(photos.map(p => p.album?.title ?? ''))].filter(Boolean), [photos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = photos.filter(p =>
      (filter === 'All' || p.album?.title === filter) &&
      `${p.title ?? ''} ${p.album?.title ?? ''} ${p.album?.location ?? ''}`.toLowerCase().includes(q),
    )
    if (sort === 'oldest') return [...list].reverse()
    if (sort === 'album') return [...list].sort((a, b) => (a.album?.title ?? '').localeCompare(b.album?.title ?? '') || a.sort_order - b.sort_order)
    return list
  }, [photos, filter, query, sort])

  const shown = filtered.slice(0, limit)

  return (
    <div className="dark-page">
      <PageHeader go={go} eyebrow="The complete archive" title={<>Photography <em>gallery</em></>}>
        <p>Places, people and moments collected over time.</p>
      </PageHeader>

      {photos.length === 0 ? (
        <div className="section-pad page-empty">
          <EmptyState loading={loading} error={error} title="The gallery is empty for now." text="Photos from published albums will show up here."/>
        </div>
      ) : (
        <>
          <div className="gallery-tools section-pad">
            <div className="filters">
              {albumNames.map(c => (
                <button className={filter === c ? 'active' : ''} onClick={() => { setFilter(c); setLimit(PAGE) }} key={c}>{c}</button>
              ))}
            </div>
            <label className="inline-search">
              <Icon name="search" size={18}/>
              <input placeholder="Search archive" value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE) }}/>
            </label>
            <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as Sort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="album">By album</option>
            </select>
          </div>

          <div className="gallery-count section-pad">
            <span>{shown.length < filtered.length ? `${shown.length} of ${filtered.length}` : filtered.length} photographs</span>
            <i/>
          </div>

          {filtered.length === 0 ? (
            <div className="section-pad page-empty"><EmptyState title="No photos match your search."/></div>
          ) : (
            <div className="masonry section-pad">
              {shown.map(p => <ImageCard key={p.id} photo={p} open={() => openPhoto(filtered, filtered.indexOf(p))}/>)}
            </div>
          )}

          {limit < filtered.length && (
            <div className="center load-more">
              <Button variant="outline" onClick={() => setLimit(l => l + PAGE)}>
                Load more <span className="muted">{Math.min(PAGE, filtered.length - limit)}</span>
              </Button>
            </div>
          )}
        </>
      )}
      <Footer go={go}/>
    </div>
  )
}
