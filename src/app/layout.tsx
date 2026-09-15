import type { Metadata, Viewport } from 'next';
import { Sora, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppPreloader } from '@/components/splash/app-preloader';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Jeunes MIMS — Notre communauté, notre élan',
    template: '%s · Jeunes MIMS',
  },
  description:
    "L'application officielle des Jeunes MIMS : cotisations, documents, événements, sondages, quiz et vie de communauté, réunis dans un seul espace.",
  applicationName: 'Jeunes MIMS',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Jeunes MIMS' },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  // Empêche les extensions de type "Dark Reader" de réinverser nos couleurs
  // (l'app est volontairement claire uniquement, cf. color-scheme ci-dessous).
  other: { 'darkreader-lock': '' },
};

export const viewport: Viewport = {
  themeColor: '#113E7D',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${sora.variable} ${plusJakartaSans.variable}`}>
      <body className="font-sans">
        <Providers>
          <AppPreloader>{children}</AppPreloader>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
