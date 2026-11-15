import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import SystemStatus, { SystemStatusFallback } from '@/components/layout/SystemStatus';
import RegisterServiceWorker from '@/components/pwa/RegisterServiceWorker';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

const SITE_URL = 'https://sentinel.djm-apps.com';

const title = 'Sentinel — Uptime Monitoring';
const description = 'Uptime, latency, and incident tracking for self-hosted services';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  applicationName: 'Sentinel',
  appleWebApp: {
    capable: true,
    title: 'Sentinel',
    statusBarStyle: 'black',
  },
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

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg-base font-sans text-text-primary antialiased">
        <AppShell
          systemStatus={
            <Suspense fallback={<SystemStatusFallback />}>
              <SystemStatus />
            </Suspense>
          }
        >
          {children}
        </AppShell>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
