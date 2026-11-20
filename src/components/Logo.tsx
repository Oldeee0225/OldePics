import { site } from '../data/site'

export function Logo({ dark = false, onClick }: { dark?: boolean; onClick?: () => void }) {
  return (
    <button
      className={`logo ${dark ? 'logo-dark' : ''}`}
      onClick={onClick ?? (() => location.assign('/'))}
      aria-label={`${site.brand} home`}
    >
      <img src={site.logoSrc} alt={site.brand}/>
    </button>
  )
}
