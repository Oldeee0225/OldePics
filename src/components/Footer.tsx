import { Link } from 'react-router-dom'
import type { Go } from '../types'
import { PATHS } from '../lib/paths'
import { site } from '../data/site'
import { Logo } from './Logo'
import { SocialLinks } from './SocialLinks'

export function Footer({ go }: { go: Go }) {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Logo onClick={() => go('home')}/>
          <p>Stories of place, people<br/>and the spaces between.</p>
        </div>
        <div>
          <b>Explore</b>
          <Link to={PATHS.gallery}>Gallery</Link>
          <Link to={PATHS.collections}>Collections</Link>
          <Link to={PATHS.about}>About</Link>
        </div>
        <div>
          <b>Follow</b>
          <SocialLinks showLabels/>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {site.brand} Photography</span>
        <span>Photography by {site.photographer}</span>
        <span>Amateur photography</span>
      </div>
    </footer>
  )
}
