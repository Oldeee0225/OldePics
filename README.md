# OldePics

Portafolio de fotografía de Oldemar Gonzalez. React + TypeScript + Vite, con Supabase para álbumes, fotos y login del admin.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y rellena las claves de Supabase
npm run dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local con recarga automática |
| `npm run build` | Comprueba tipos y genera la web en `dist/` |
| `npm run images` | Optimiza las fotos de `assets/` → `public/img/` |

## Fotos

- **Originales** en `assets/` (no se suben a GitHub ni se publican).
- **Portada, About, login, Featured y Gallery**: fotos fijas. Tras añadir originales, ejecuta `npm run images` y colócalas en `src/data/featured.ts` o `src/data/gallery.ts`.
- **Álbumes**: se suben desde el panel de admin a Supabase, con contraseña.

## Supabase

SQL en `supabase/` (ejecutar en el SQL Editor): `schema.sql` crea todo desde cero; `album-passwords.sql` y `fix-storage-listing.sql` son migraciones ya incluidas en el schema.

## Despliegue

Vercel, conectado a este repositorio: cada push a `main` publica la web. Variables de entorno en Vercel: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
