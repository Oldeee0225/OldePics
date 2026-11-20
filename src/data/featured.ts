// Fotos de la sección "Featured stories" de la portada.
// Origen: assets/2ndSection → optimizadas en public/img/featured (npm run images)
//
// Las fotos se agrupan en bloques. Cada bloque tiene un diseño:
//   'feature-right' → [grande horizontal, vertical alta a la derecha, horizontal pequeña, relleno]
//   'feature-left'  → igual pero en espejo (la vertical a la izquierda)
//   'row'           → fila de fotos verticales del mismo tamaño (3 o 4)
//
// Al añadir fotos nuevas a 2ndSection, `npm run images` avisa de las que no están aquí.

export interface FeaturedPhoto {
  id: string        // nombre del archivo original, sin extensión
  alt: string
}

export type FeaturedLayout = 'feature-right' | 'feature-left' | 'row'

export interface FeaturedBlock {
  layout: FeaturedLayout
  photos: FeaturedPhoto[]
}

export const featuredBlocks: FeaturedBlock[] = [
  {
    layout: 'feature-right',
    photos: [
      { id: '009', alt: 'Wild flowers with mountains in the distance' },
      { id: '017', alt: 'Hydrangeas in soft light' },
      { id: '018', alt: 'House with a red roof among the trees' },
      { id: '006', alt: 'Red flower in a sunlit planter' },
    ],
  },
  {
    layout: 'feature-left',
    photos: [
      { id: '004', alt: 'Stream flowing over rocks in the jungle' },
      { id: '003', alt: 'Waterfall beside a concrete wall' },
      { id: '008', alt: 'Waves on the beach at sunset' },
      { id: '010', alt: 'Tracks in the sand under a beam of light' },
    ],
  },
]

export const featuredSrc = (id: string, w: 800 | 1600) => `/img/featured/${id}-${w}.jpg`
