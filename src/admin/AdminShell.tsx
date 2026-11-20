import type { ReactNode } from 'react'
import type { Go, Page } from '../types'
import { site } from '../data/site'
import { signOut } from '../lib/auth'
import { Icon, type IconName } from '../components/Icon'
import { Logo } from '../components/Logo'

const items: [Page, IconName, string][] = [
  ['admin', 'folder', 'Albums'],
  ['upload', 'upload', 'New album'],
  ['home', 'eye', 'View site'],
]

export function AdminShell({ page, go, email, children }: { page: Page; go: Go; email?: string; children: ReactNode }) {
  const logout = async () => { await signOut(); go('home') }

  return (
    <div className="admin-layout">
      <aside className="admin-side">
        <Logo dark onClick={() => go('home')}/>
        <div className="admin-user">
          <span>{site.initials}</span>
          <div><b>{site.photographer}</b><small>{email ?? 'Administrator'}</small></div>
        </div>
        <nav>
          {items.map(([p, i, l]) => (
            <button className={page === p ? 'active' : ''} onClick={() => go(p)} key={l}>
              <Icon name={i}/>{l}
            </button>
          ))}
        </nav>
        <button className="logout-btn" onClick={logout}><Icon name="logout"/> Sign out</button>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
