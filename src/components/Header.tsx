import { useState } from 'react'
import type { Go, Page } from '../types'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { SocialLinks } from './SocialLinks'

export function Header({ go }: { go: Go }) {
  const [open, setOpen] = useState(false)
  const link = (p: Page, label: string) => (
    <button onClick={() => { go(p); setOpen(false) }}>{label}</button>
  )

  return (
    <header className="site-header">
      <Logo onClick={() => go('home')}/>
      <nav className={open ? 'open' : ''}>
        {link('gallery', 'Gallery')}
        {link('collections', 'Collections')}
        {link('about', 'About')}
        <button className="mobile-admin" onClick={() => go('login')}>Admin login</button>
        <div className="mobile-social"><SocialLinks showLabels/></div>
      </nav>
      <div className="header-actions">
        <SocialLinks size={17}/>
        <button className="admin-link" onClick={() => go('login')}>Admin</button>
        <button className="menu-button" aria-label="Menu" onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'}/>
        </button>
      </div>
    </header>
  )
}
