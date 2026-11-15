import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sentinel',
    short_name: 'Sentinel',
    description: 'Uptime and incident monitoring for self-hosted services',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
