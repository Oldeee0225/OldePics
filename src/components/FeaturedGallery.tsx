import { featuredBlocks, featuredSrc } from '../data/featured'

// Galería editorial de la portada: solo fotos, sin textos encima.
// Cada bloque usa un diseño (ver featured.ts) y cada foto un rol .f-1 … .f-4 (ver featured.css)
export function FeaturedGallery() {
  return (
    <div className="featured-gallery">
      {featuredBlocks.map((block, b) => (
        <div key={b} className={`featured-grid fb-${block.layout}`}>
          {block.photos.map((p, i) => (
            <figure key={p.id} className={`featured-item f-${i + 1}`}>
              <img
                src={featuredSrc(p.id, 1600)}
                srcSet={`${featuredSrc(p.id, 800)} 800w, ${featuredSrc(p.id, 1600)} 1600w`}
                sizes={block.layout === 'row' ? '(max-width: 620px) 100vw, 25vw' : '(max-width: 620px) 100vw, 60vw'}
                alt={p.alt}
                loading="lazy"
              />
            </figure>
          ))}
        </div>
      ))}
    </div>
  )
}
