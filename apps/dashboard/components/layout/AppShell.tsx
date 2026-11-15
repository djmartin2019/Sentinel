'use client';

import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { NavigationProvider } from '@/components/layout/NavigationContext';

export default function AppShell({
  children,
  systemStatus,
}: {
  children: ReactNode;
  systemStatus?: ReactNode;
}) {
  return (
    <NavigationProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar systemStatus={systemStatus} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="app-canvas flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </NavigationProvider>
  );
}
