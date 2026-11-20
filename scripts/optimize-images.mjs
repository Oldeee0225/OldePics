// Genera versiones web de los originales en assets/ → public/img
// Uso: npm run images
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { parse } from 'node:path'

const SRC = 'assets'          // originales: NO se publican en la web
const OUT = 'public/img'
mkdirSync(OUT, { recursive: true })

const jpeg = (input, output, width, quality = 80) =>
  sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toFile(output)

// ---------- Hero ----------
await jpeg(`${SRC}/Header.jpg.jpeg`, `${OUT}/hero.jpg`, 2560)

// ---------- About (retrato) ----------
await jpeg(`${SRC}/About.jpeg`, `${OUT}/about.jpg`, 1400)

// ---------- Login del admin ----------
await jpeg(`${SRC}/AdminPicture.jpeg`, `${OUT}/login.jpg`, 1400, 72)

// ---------- Featured (2ndSection) ----------
// Dos tamaños por foto: -800 (móvil) y -1600 (escritorio) para srcset.
// Solo procesa las que aún no existen (más rápido al añadir fotos nuevas).
mkdirSync(`${OUT}/featured`, { recursive: true })
const featuredIds = []
for (const file of readdirSync(`${SRC}/2ndSection`).sort()) {
  if (!/\.(jpe?g|png)$/i.test(file)) continue
  const { name } = parse(file)
  featuredIds.push(name)
  const input = `${SRC}/2ndSection/${file}`
  for (const [w, q] of [[800, 78], [1600, 80]]) {
    const output = `${OUT}/featured/${name}-${w}.jpg`
    if (!existsSync(output)) await jpeg(input, output, w, q)
  }
}

// Aviso: fotos en 2ndSection que todavía no están colocadas en featured.ts ni en gallery.ts
const featuredTs = readFileSync('src/data/featured.ts', 'utf8') + readFileSync('src/data/gallery.ts', 'utf8')
const unused = featuredIds.filter(id => !featuredTs.includes(`'${id}'`))
if (unused.length) {
  console.log(`⚠ Fotos en 2ndSection sin colocar (ni en featured.ts ni en gallery.ts): ${unused.join(', ')}`)
}

// ---------- Logo ----------
// El original tiene fondo negro. Lo convertimos a transparencia
// (alpha = brillo del píxel, y "des-premultiplicamos" el color) para que
// funcione sobre cualquier fondo.
const { data, info } = await sharp(`${SRC}/OldePicsLogo.png`)
  .resize(360, 360)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

const out = Buffer.alloc(info.width * info.height * 4)
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  let a = Math.max(r, g, b)
  a = a < 18 ? 0 : a // limpia el ruido casi-negro del fondo
  const k = a ? 255 / a : 0
  out[j] = Math.min(255, Math.round(r * k))
  out[j + 1] = Math.min(255, Math.round(g * k))
  out[j + 2] = Math.min(255, Math.round(b * k))
  out[j + 3] = a
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}/logo.png`)

// Versión con fondo negro (favicon / fondos claros)
await sharp(`${SRC}/OldePicsLogo.png`)
  .resize(192, 192)
  .png({ compressionLevel: 9, palette: true })
  .toFile(`${OUT}/logo-badge.png`)

// ---------- Icono del admin (navbar) ----------
// Recorte circular justo en el borde del aro dorado (quita el halo de color
// que trae el PNG por fuera) y versión pequeña: se muestra a ~34px.
{
  const CX = 616, CY = 633, R = 575          // centro y radio del aro en el original 1254×1254
  const size = R * 2
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${R}" cy="${R}" r="${R - 2}" fill="#fff"/></svg>`,
  )
  const circle = await sharp(`${SRC}/IconAdmin.png`)
    .extract({ left: CX - R, top: CY - R, width: size, height: size })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  await sharp(circle).resize(112, 112).png({ compressionLevel: 9 }).toFile(`${OUT}/admin-icon.png`)
}

// ---------- Iconos (favicon, Apple, Android) ----------
for (const [size, name] of [[32, 'favicon-32.png'], [180, 'apple-touch-icon.png'], [192, 'icon-192.png'], [512, 'icon-512.png']]) {
  await sharp(`${SRC}/OldePicsLogo.png`).resize(size, size).png({ compressionLevel: 9 }).toFile(`public/${name}`)
}

// ---------- Imagen para compartir (Open Graph: WhatsApp, Facebook, X…) ----------
// 1200×630: foto del hero oscurecida + logo (versión transparente) centrado.
const OG_W = 1200, OG_H = 630
const ogBackground = await sharp(`${SRC}/Header.jpg.jpeg`)
  .rotate()
  .resize(OG_W, OG_H, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.55, saturation: 0.8 })
  .toBuffer()
const vignette = Buffer.from(
  `<svg width="${OG_W}" height="${OG_H}"><defs><radialGradient id="g" cx="50%" cy="50%" r="65%">
    <stop offset="0%" stop-color="#000" stop-opacity="0.15"/><stop offset="100%" stop-color="#000" stop-opacity="0.75"/>
  </radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
)
const ogLogo = await sharp(`${OUT}/logo.png`).resize(470, 470).toBuffer()
await sharp(ogBackground)
  .composite([{ input: vignette }, { input: ogLogo, gravity: 'centre' }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(`${OUT}/og-image.jpg`)

console.log('Images optimized → public/img')
