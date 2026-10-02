import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jeunes MIMS',
    short_name: 'Jeunes MIMS',
    description:
      "L'appli des Jeunes MIMS : cotisations, documents, événements, sondages et quiz, dans ta poche.",
    start_url: '/tableau-de-bord',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F0F4F4',
    theme_color: '#113E7D',
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
