import type { ReactNode } from 'react'
import type { Go } from '../types'
import { Header } from './Header'

interface PageHeaderProps {
  go: Go
  title: ReactNode
  eyebrow: string
  children?: ReactNode
}

export function PageHeader({ go, title, eyebrow, children }: PageHeaderProps) {
  return (
    <>
      <Header go={go}/>
      <div className="page-hero section-pad">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children}
      </div>
    </>
  )
}
