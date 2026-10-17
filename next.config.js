/** @type {import('next').NextConfig} */
// En-têtes de sécurité du site : pas d'affichage dans une page tierce (détournement de clics),
// pas de devinette du type des fichiers, adresse d'origine non transmise aux autres sites,
// géolocalisation réservée à l'appli elle-même.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Les fichiers (avatars, pièces jointes) gardent leur adresse /files/... enregistrée en base.
  async rewrites() {
    return [{ source: '/files/:path*', destination: '/api/files/:path*' }];
  },
  experimental: {
    // Fichiers lus sur le disque par l'API, à embarquer dans la fonction Vercel.
    outputFileTracingIncludes: {
      // argon2 et Prisma chargent leur binaire par un chemin calculé : Vercel ne le voit pas tout seul.
      '/api/**': [
        './assets/**',
        './node_modules/pdfkit/js/data/**',
        './node_modules/argon2/prebuilds/linux-x64/**',
        './node_modules/.prisma/client/**',
      ],
    },
  },
};

module.exports = nextConfig;
