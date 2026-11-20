import type { Go } from '../types'
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
          <button onClick={() => go('gallery')}>Gallery</button>
          <button onClick={() => go('collections')}>Collections</button>
          <button onClick={() => go('about')}>About</button>
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
