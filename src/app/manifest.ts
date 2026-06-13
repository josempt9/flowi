import type { MetadataRoute } from 'next'

// Necesario para que el manifest se genere como archivo estático en output: export.
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flowi — Inteligencia financiera personal',
    short_name: 'Flowi',
    description:
      'Control total de tu liquidez personal: registro ultrarrápido, multicuenta, tarjetas, float y proyecciones.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    lang: 'es-MX',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
