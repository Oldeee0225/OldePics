import { useEffect, useState } from 'react'
import type { Page, Photo } from './types'
import { useSession } from './lib/auth'
import { PhotoViewer } from './components/PhotoViewer'
import { Home } from './pages/Home'
import { Gallery } from './pages/Gallery'
import { Collections } from './pages/Collections'
import { Album } from './pages/Album'
import { About } from './pages/About'
import { Login } from './pages/Login'
import { Dashboard } from './admin/Dashboard'
import { Upload } from './admin/Upload'
import { AlbumEdit } from './admin/AlbumEdit'

const ADMIN_PAGES: Page[] = ['admin', 'upload', 'edit']

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [albumSlug, setAlbumSlug] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null)
  const session = useSession()

  const go = (p: Page) => { setPage(p); setViewer(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openAlbum = (slug: string) => { setAlbumSlug(slug); go('album') }
  const editAlbum = (slug: string) => { setAlbumSlug(slug); go('edit') }
  const openPhoto = (photos: Photo[], index: number) => { setViewer({ photos, index }) }

  // Admin protegido: sin sesión → login
  const needsLogin = ADMIN_PAGES.includes(page) && session === null
  useEffect(() => { if (needsLogin) setPage('login') }, [needsLogin])
  // Ya con sesión, el login lleva directo al admin
  useEffect(() => { if (page === 'login' && session) setPage('admin') }, [page, session])

  const email = session?.user.email

  const renderPage = () => {
    switch (page) {
      case 'home': return <Home go={go} openAlbum={openAlbum}/>
      case 'gallery': return <Gallery go={go} openPhoto={openPhoto}/>
      case 'collections': return <Collections go={go} openAlbum={openAlbum}/>
      case 'album': return <Album go={go} slug={albumSlug} openPhoto={openPhoto}/>
      case 'about': return <About go={go}/>
      case 'login': return <Login go={go}/>
      case 'admin': return session ? <Dashboard go={go} email={email} openAlbum={openAlbum} editAlbum={editAlbum}/> : null
      case 'edit': return session ? <AlbumEdit go={go} email={email} slug={albumSlug} openAlbum={openAlbum}/> : null
      case 'upload': return session ? <Upload go={go} email={email}/> : null
    }
  }

  return (
    <>
      {renderPage()}
      {viewer && (
        <PhotoViewer
          photos={viewer.photos}
          index={viewer.index}
          setIndex={index => setViewer(v => (v ? { ...v, index } : v))}
          close={() => setViewer(null)}
        />
      )}
    </>
  )
}
