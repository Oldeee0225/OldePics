import { site } from '../data/site'
import { Icon } from './Icon'

// Iconos de redes sociales. `showLabels` añade el nombre al lado del icono.
export function SocialLinks({ showLabels = false, size = 18 }: { showLabels?: boolean; size?: number }) {
  return (
    <div className={`social-links ${showLabels ? 'with-labels' : ''}`}>
      {site.social.map(s => (
        <a
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${s.name} ${s.handle}`}
          title={`${s.name} ${s.handle}`}
        >
          <Icon name={s.icon} size={size}/>
          {showLabels && <span>{s.name}</span>}
        </a>
      ))}
    </div>
  )
}
