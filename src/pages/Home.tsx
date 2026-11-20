import type { Go, OpenAlbum } from '../types'
import { site } from '../data/site'
import { listAlbums } from '../lib/api'
import { useQuery } from '../lib/useQuery'
import { publicUrl } from '../lib/supabase'
import { pad2 } from '../lib/format'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/Button'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { FeaturedGallery } from '../components/FeaturedGallery'
import { usePageMeta } from '../lib/meta'

interface Props { go: Go; openAlbum: OpenAlbum }

export function Home({ go, openAlbum }: Props) {
  usePageMeta(null)
  const { data: albums = [], loading, error } = useQuery('albums', () => listAlbums())

  return (
    <>
      <section className="hero">
        <img src={site.heroSrc} alt={site.heroAlt}/>
        <div className="hero-shade"/>
        <Header go={go}/>
        <div className="hero-copy">
          <span className="eyebrow">Independent photography · 2018—2025</span>
          <h1>Capturing moments.<br/><em>Telling stories.</em></h1>
          <p>A visual collection of moments, places<br className="desktop"/> and perspectives.</p>
          <div className="hero-buttons">
            <Button onClick={() => go('gallery')} icon="arrow">Explore gallery</Button>
            <Button variant="outline" onClick={() => go('collections')}>Discover collections</Button>
          </div>
        </div>
        <div className="hero-index"><span>01</span><i/><span>12</span></div>
        <span className="scroll-label">Scroll to explore</span>
      </section>

      <main>
        <section className="featured section-pad">
          <div className="section-head">
            <div><span className="eyebrow">Selected work</span><h2>Featured <em>stories</em></h2></div>
            <p>A considered selection of recent frames—quiet observations from landscapes, and lives in motion.</p>
          </div>
          <FeaturedGallery/>
        </section>

        <section className="collection-preview section-pad">
          <div className="section-head">
            <div><span className="eyebrow">Curated bodies of work</span><h2>Explore <em>collections</em></h2></div>
            <button className="text-link" onClick={() => go('collections')}>View all collections <Icon name="arrow"/></button>
          </div>
          {albums.length === 0 ? (
            <EmptyState loading={loading} error={error} title="Albums are on the way." text="The first collections will be published here very soon."/>
          ) : (
            <div className="collection-strip">
              {albums.slice(0, 3).map((a, i) => (
                <button key={a.id} onClick={() => openAlbum(a.slug)} className="collection-card">
                  <div>
                    {a.cover_thumb_path && <img src={publicUrl(a.cover_thumb_path)} alt="" loading="lazy"/>}
                    <span>{pad2(i + 1)}</span>
                    {a.is_protected && <b className="lock-badge"><Icon name="lock" size={12}/> Private</b>}
                  </div>
                  <h3>{a.title}</h3>
                  {a.description && <p>{a.description}</p>}
                  <small>{a.photo_count} photographs</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="about-preview section-pad">
          <div className="about-photo"><img src={site.portraitSrc} alt={site.portraitAlt}/></div>
          <div className="about-copy">
            <span className="eyebrow">Behind the lens</span>
            <h2>Just a guy<br/>with a <em>camera.</em></h2>
            <p className="lead">I’m {site.photographer}, an amateur photographer taking my first steps — learning as I go.</p>
            <p>Mostly flowers, mountains and quiet places near home. Nothing fancy, just photos I enjoy taking.</p>
            <Button variant="outline" onClick={() => go('about')} icon="arrow">More about me</Button>
            <div className="signature">{site.photographer}</div>
          </div>
        </section>
      </main>
      <Footer go={go}/>
    </>
  )
}
