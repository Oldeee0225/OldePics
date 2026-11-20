// ---------------------------------------------------------------------
//  Vista previa al compartir enlaces (WhatsApp, Facebook, X…)
//
//  Esas apps NO ejecutan JavaScript: leen el HTML tal cual llega. Esta
//  función de Vercel entrega el mismo index.html de la web pero con el
//  título, descripción e imagen de cada página ya escritos. Para los
//  álbumes consulta Supabase (título + portada).
//
//  vercel.json envía aquí todas las páginas (no los archivos estáticos).
// ---------------------------------------------------------------------

export const config = { runtime: 'edge' }

const SITE = 'https://www.oldepics.com'

interface Meta {
  title: string
  description: string
  image: string
  imageWidth?: number
  imageHeight?: number
  imageAlt: string
  noindex?: boolean
}

const DEFAULT: Meta = {
  title: 'OldePics — Photography by Oldemar Gonzalez',
  description: 'Flowers, mountains, gardens and quiet places. Learning to see, one photo at a time.',
  image: `${SITE}/img/og-image.jpg`,
  imageWidth: 1200,
  imageHeight: 630,
  imageAlt: 'OldePics Photography logo over a mountain landscape',
}

const PAGES: Record<string, Partial<Meta>> = {
  '/gallery': {
    title: 'Gallery — OldePics',
    description: 'Places, people and moments collected over time — photography by Oldemar Gonzalez.',
    image: `${SITE}/img/featured/009-1600.jpg`, imageWidth: 1600, imageHeight: 1067,
    imageAlt: 'Wild flowers with mountains in the distance',
  },
  '/collections': {
    title: 'Collections — OldePics',
    description: 'Photo albums by Oldemar Gonzalez, grouped by place, subject and a shared feeling.',
    image: `${SITE}/img/featured/004-1600.jpg`, imageWidth: 1600, imageHeight: 1067,
    imageAlt: 'Stream flowing over rocks in the jungle',
  },
  '/about': {
    title: 'About — OldePics',
    description: 'Oldemar Gonzalez — an amateur photographer learning to see, one photo at a time.',
    image: `${SITE}/img/about.jpg`, imageWidth: 1400, imageHeight: 2100,
    imageAlt: 'Oldemar Gonzalez taking a photo in a mirror',
  },
  '/login': { title: 'Admin login — OldePics', noindex: true },
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function albumMeta(slug: string): Promise<Partial<Meta> | null> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const res = await fetch(
      `${url}/rest/v1/albums?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true` +
        '&select=title,description,location,cover_path,cover_thumb_path,photo_count,is_protected&limit=1',
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    )
    if (!res.ok) return null
    const [album] = (await res.json()) as {
      title: string; description: string | null; location: string | null
      cover_path: string | null; cover_thumb_path: string | null
      photo_count: number; is_protected: boolean
    }[]
    if (!album) return null

    const details = [
      album.is_protected ? 'Private album' : 'Album',
      `${album.photo_count} photos`,
      album.location,
    ].filter(Boolean).join(' · ')
    const cover = album.cover_thumb_path ?? album.cover_path
    return {
      title: `${album.title} — OldePics`,
      description: album.description ? `${album.description} (${details})` : `${details} — photography by Oldemar Gonzalez.`,
      ...(cover && {
        image: `${url}/storage/v1/object/public/photos/${cover}`,
        imageWidth: undefined,
        imageHeight: undefined,
        imageAlt: `Cover of the album “${album.title}”`,
      }),
    }
  } catch {
    return null
  }
}

function inject(html: string, meta: Meta, pageUrl: string): string {
  const set = (attr: 'name' | 'property', key: string, value: string) => {
    html = html.replace(
      new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
      `$1${esc(value)}$2`,
    )
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`)
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(pageUrl)}$2`)
  set('name', 'description', meta.description)
  set('property', 'og:url', pageUrl)
  set('property', 'og:title', meta.title)
  set('property', 'og:description', meta.description)
  set('property', 'og:image', meta.image)
  set('property', 'og:image:secure_url', meta.image)
  set('property', 'og:image:alt', meta.imageAlt)
  set('name', 'twitter:title', meta.title)
  set('name', 'twitter:description', meta.description)
  set('name', 'twitter:image', meta.image)
  set('name', 'twitter:image:alt', meta.imageAlt)

  if (meta.imageWidth && meta.imageHeight) {
    set('property', 'og:image:width', String(meta.imageWidth))
    set('property', 'og:image:height', String(meta.imageHeight))
  } else {
    // tamaño desconocido (portadas de álbum): mejor no declararlo
    html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*" \/>/g, '')
  }
  if (meta.noindex) html = html.replace('</head>', '    <meta name="robots" content="noindex" />\n  </head>')
  return html
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url)
  // Ruta original de la página (vercel.json la pasa como ?path=)
  let path = reqUrl.searchParams.get('path') || '/'
  if (!path.startsWith('/')) path = `/${path}`
  path = path.replace(/\/+$/, '') || '/'

  const htmlRes = await fetch(`${reqUrl.origin}/index.html`)
  const html = await htmlRes.text()

  let page: Partial<Meta> | null = PAGES[path] ?? null
  const album = path.match(/^\/albums\/([^/]+)$/)
  if (album) page = await albumMeta(decodeURIComponent(album[1]))
  if (path.startsWith('/admin')) page = { title: 'Admin — OldePics', noindex: true }

  const meta: Meta = { ...DEFAULT, ...page }
  return new Response(inject(html, meta, `${SITE}${path === '/' ? '/' : path}`), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // se cachea poco: así un álbum nuevo o editado se refleja rápido
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
