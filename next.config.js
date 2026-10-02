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
  images: {
    remotePatterns: [
      // Développement : fichiers servis par l'API NestJS locale.
      // Production : remplacer par le domaine réel de l'API (ou du CDN/S3).
      { protocol: 'http', hostname: 'localhost', port: '4000' },
    ],
  },
};

module.exports = nextConfig;
