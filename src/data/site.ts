// Datos generales del sitio (centralizados para cambiarlos en un solo lugar)
export const site = {
  brand: 'OldePics',
  logoSrc: '/img/logo.png',
  heroSrc: '/img/hero.jpg',
  heroAlt: 'Mountain range above a green valley',
  photographer: 'Oldemar Gonzalez',
  firstName: 'Oldemar',
  initials: 'OG',
  portraitSrc: '/img/about.jpg',
  portraitAlt: 'Oldemar Gonzalez taking a photo in a mirror',
  loginSrc: '/img/login.jpg', // foto de la pantalla de acceso al admin
  loginAlt: 'Oldemar Gonzalez standing in front of a waterfall',
  social: [
    { name: 'Instagram', handle: '@_oldepics', icon: 'instagram', url: 'https://www.instagram.com/_oldepics/' },
    { name: 'TikTok', handle: '@_oldepics', icon: 'tiktok', url: 'https://www.tiktok.com/@_oldepics' },
  ] as const,
}
