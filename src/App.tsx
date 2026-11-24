import { useEffect, useState, type ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { Go, Photo } from './types'
import { useSession } from './lib/auth'
import { usePageMeta } from './lib/meta'
import { PATHS, albumPath } from './lib/paths'
import { PhotoViewer } from './components/PhotoViewer'
import { EmptyState } from './components/EmptyState'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Button } from './components/Button'
import { Home } from './pages/Home'
import { Gallery } from './pages/Gallery'
import { Collections } from './pages/Collections'
import { Album } from './pages/Album'
import { About } from './pages/About'
import { Login } from './pages/Login'
import { Dashboard } from './admin/Dashboard'
import { Upload } from './admin/Upload'
import { AlbumEdit } from './admin/AlbumEdit'
import { GalleryAdmin } from './admin/GalleryAdmin'

export default function App() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const session = useSession()
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null)

  // Al cambiar de página: cerrar el visor y volver arriba
  useEffect(() => { setViewer(null); window.scrollTo(0, 0) }, [pathname])

  const go: Go = p => navigate(PATHS[p])
  const openAlbum = (slug: string) => navigate(albumPath(slug))
  const editAlbum = (slug: string) => navigate(`/admin/albums/${slug}`)
  const openPhoto = (photos: Photo[], index: number) => setViewer({ photos, index })
  const email = session?.user.email

  // Admin protegido: mientras se comprueba la sesión no se muestra nada; sin sesión → /login
  const admin = (el: ReactElement) => (session === undefined ? null : session ? el : <Navigate to="/login" replace/>)

  return (
    <>
      <Routes>
        <Route path="/" element={<Home go={go} openAlbum={openAlbum}/>}/>
        <Route path="/gallery" element={<Gallery go={go} openPhoto={openPhoto}/>}/>
        <Route path="/collections" element={<Collections go={go} openAlbum={openAlbum}/>}/>
        <Route path="/albums/:slug" element={<AlbumRoute go={go} openPhoto={openPhoto}/>}/>
        <Route path="/about" element={<About go={go}/>}/>
        <Route path="/login" element={session ? <Navigate to="/admin" replace/> : <Login go={go}/>}/>
        <Route path="/admin" element={admin(<Dashboard go={go} email={email} openAlbum={openAlbum} editAlbum={editAlbum}/>)}/>
        <Route path="/admin/new" element={admin(<Upload go={go} email={email}/>)}/>
        <Route path="/admin/gallery" element={admin(<GalleryAdmin go={go} email={email}/>)}/>
        <Route path="/admin/albums/:slug" element={admin(<EditRoute go={go} email={email} openAlbum={openAlbum}/>)}/>
        <Route path="*" element={<NotFound go={go}/>}/>
      </Routes>

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

function AlbumRoute({ go, openPhoto }: { go: Go; openPhoto: (p: Photo[], i: number) => void }) {
  const { slug = null } = useParams()
  // key: al pasar de un álbum a otro se reinicia (contraseña, etc.)
  return <Album key={slug} go={go} slug={slug} openPhoto={openPhoto}/>
}

function EditRoute({ go, email, openAlbum }: { go: Go; email?: string; openAlbum: (s: string) => void }) {
  const { slug = null } = useParams()
  return <AlbumEdit key={slug} go={go} email={email} slug={slug} openAlbum={openAlbum}/>
}

function NotFound({ go }: { go: Go }) {
  usePageMeta('Page not found')
  return (
    <div className="dark-page">
      <Header go={go}/>
      <div className="section-pad page-empty">
        <EmptyState title="This page doesn’t exist.">
          <Button variant="outline" onClick={() => go('home')}>← Back to home</Button>
        </EmptyState>
      </div>
      <Footer go={go}/>
    </div>
  )
}
