import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Sentinel — Observability Platform',
  description: 'Distributed infrastructure monitoring and observability',
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
