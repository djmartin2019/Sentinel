'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Menu } from 'lucide-react';
import { useNavigation } from '@/components/layout/NavigationContext';
import { cn } from '@/lib/utils';
import AlertsPanel from '@/components/pwa/AlertsPanel';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function formatNow() {
  return new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toggleMobile } = useNavigation();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  // Rendered client-side only so server/client clocks can't mismatch.
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatNow());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-(--spacing-layout-header) shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-base/70 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleMobile}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-accent-cyan/40 hover:text-text-primary md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-sm font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {now && (
          <span className="hidden font-mono text-xs text-text-muted md:inline">
            {now}
          </span>
        )}
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-elevated/60 px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-text-primary disabled:opacity-60"
          aria-label="Refresh"
        >
          <RefreshCw
            className={cn('h-3 w-3', isRefreshing && 'animate-spin')}
            strokeWidth={2}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <AlertsPanel />
      </div>
    </header>
  );
}
