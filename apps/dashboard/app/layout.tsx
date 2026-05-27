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
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Sentinel',
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
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
