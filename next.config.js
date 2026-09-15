/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Développement : fichiers servis par l'API NestJS locale.
      // Production : remplacer par le domaine réel de l'API (ou du CDN/S3).
      { protocol: 'http', hostname: 'localhost', port: '4000' },
    ],
  },
};

module.exports = nextConfig;
