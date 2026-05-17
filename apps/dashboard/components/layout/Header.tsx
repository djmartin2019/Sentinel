'use client';

import { Bell, RefreshCw, Clock, Menu } from 'lucide-react';
import { useNavigation } from '@/components/layout/NavigationContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toggleMobile } = useNavigation();
  const now = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  return (
    <header className="sticky top-0 z-20 flex h-(--spacing-layout-header) shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-surface/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleMobile}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border text-text-muted transition-colors hover:border-accent-cyan/40 hover:text-text-primary md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-sm font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-[11px] text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-1.5 font-mono text-xs text-text-muted sm:flex">
          <Clock className="h-3 w-3" />
          <span className="hidden md:inline">{now}</span>
        </div>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-cyan/40 hover:text-accent-cyan"
          aria-label="Refresh"
        >
          <RefreshCw className="h-3 w-3" strokeWidth={2} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded border border-border text-text-muted transition-colors hover:border-border hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-status-down" />
        </button>
      </div>
    </header>
  );
}
