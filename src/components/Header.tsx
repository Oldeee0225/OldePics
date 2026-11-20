import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Go, Page } from '../types'
import { PATHS } from '../lib/paths'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SocialLinks } from './SocialLinks'

export function Header({ go }: { go: Go }) {
  const [open, setOpen] = useState(false)
  // Enlaces reales: se pueden abrir en otra pestaña y Google los sigue
  const link = (p: Page, label: string) => (
    <NavLink to={PATHS[p]} onClick={() => setOpen(false)}>{label}</NavLink>
  )

  return (
    <header className="site-header">
      <Logo onClick={() => go('home')}/>
      <nav className={open ? 'open' : ''}>
        {link('gallery', 'Gallery')}
        {link('collections', 'Collections')}
        {link('about', 'About')}
        <div className="mobile-social"><SocialLinks showLabels/></div>
      </nav>
      <div className="header-actions">
        <SocialLinks size={17}/>
        <Link to={PATHS.login} className="admin-link" aria-label="Admin" title="Admin">
          <img src="/img/admin-icon.png" alt="" width={34} height={34}/>
        </Link>
        <button className="menu-button" aria-label="Menu" onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'}/>
        </button>
      </div>
    </header>
  )
}
