import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'MisFinanzas — Panel de Finanzas Personales',
    short_name: 'MisFinanzas',
    description: 'Gestiona tus gastos, inversiones, cripto y objetivos de ahorro.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#070b14',
    theme_color: '#070b14',
    lang: 'es',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Gastos', url: '/gastos', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Portfolio Cripto', url: '/cripto', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Patrimonio', url: '/patrimonio', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
