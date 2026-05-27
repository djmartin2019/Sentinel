import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

const SITE_URL = 'https://sentinel.djm-apps.com';

const title = 'Sentinel — Observability Platform';
const description = 'Distributed infrastructure monitoring and observability';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon-48x48.png',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Sentinel',
    title,
    description,
    images: [
      {
        url: '/OG-Sentinel.png',
        width: 1120,
        height: 630,
        alt: 'Sentinel — Observability Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/OG-Sentinel.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-base text-text-primary antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
