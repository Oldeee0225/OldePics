import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'

interface Props {
  title: ReactNode
  text?: string
  children?: ReactNode
  loading?: boolean
  error?: Error | null
}

/** Mensaje para cuando no hay contenido, está cargando o hubo un error. */
export function EmptyState({ title, text, children, loading, error }: Props) {
  if (loading) {
    return <div className="empty-state"><span className="loader" aria-label="Loading"/></div>
  }
  if (error) {
    return (
      <div className="empty-state">
        <span className="eyebrow">Something went wrong</span>
        <h3>We couldn’t load this content.</h3>
        <p>{error.message}</p>
      </div>
    )
  }
  return (
    <div className="empty-state">
      <span className="eyebrow">{isSupabaseConfigured ? 'Coming soon' : 'Not connected'}</span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}
