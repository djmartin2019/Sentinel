'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Activity,
  Server,
  Settings,
  ChevronLeft,
  Zap,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/components/layout/NavigationContext';

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Targets', href: '/targets', icon: Radio },
  { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { label: 'Telemetry', href: '/telemetry', icon: Activity },
  { label: 'Services', href: '/services', icon: Server },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mobileOpen, closeMobile } = useNavigation();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeMobile}
        aria-hidden={!mobileOpen}
      />
      <aside
        className={cn(
          'flex h-screen w-[min(280px,85vw)] flex-col overflow-visible border-r border-border bg-bg-surface transition-transform duration-300 ease-in-out',
          'fixed inset-y-0 left-0 z-50 md:static md:z-auto md:shrink-0 md:translate-x-0',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full pointer-events-none md:pointer-events-auto',
          collapsed ? 'md:w-[60px]' : 'md:w-[220px]'
        )}
      >
        <div
          className={cn(
            'flex h-(--spacing-layout-header) shrink-0 items-center gap-2.5 border-b border-border px-4',
            collapsed && 'md:justify-center md:px-0'
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-accent-cyan/30 bg-accent-cyan/10">
            <Zap className="h-3.5 w-3.5 text-accent-cyan" strokeWidth={2.5} />
          </div>
          <span
            className={cn(
              'text-sm font-semibold uppercase tracking-wider text-text-primary',
              collapsed && 'md:hidden'
            )}
          >
            Sentinel
          </span>
          <button
            type="button"
            onClick={closeMobile}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded border border-border text-text-muted hover:text-text-primary md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active =
              href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  'group flex items-center gap-3 rounded border px-2.5 py-2 text-sm transition-all duration-150',
                  active
                    ? 'border-accent-cyan/20 bg-accent-cyan/10 text-accent-cyan'
                    : 'border-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  collapsed && 'md:justify-center md:px-0'
                )}
                title={collapsed ? label : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active
                      ? 'text-accent-cyan'
                      : 'text-text-muted group-hover:text-text-secondary'
                  )}
                  strokeWidth={1.75}
                />
                <span className={cn('truncate', collapsed && 'md:hidden')}>
                  {label}
                </span>
                {!collapsed && active && (
                  <span className="ml-auto h-1 w-1 rounded-full bg-accent-cyan" />
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'mx-2 mb-2 rounded border border-border bg-bg-card px-3 py-2.5',
            collapsed && 'md:hidden'
          )}
        >
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-up opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-status-up" />
            </span>
            <span>All systems operational</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'absolute -right-3 top-[calc(var(--spacing-layout-header)/2)] z-[60] hidden -translate-y-1/2 md:flex',
            'h-6 w-6 items-center justify-center rounded-full',
            'border border-border bg-bg-elevated text-text-muted shadow-md',
            'transition-colors hover:border-accent-cyan/50 hover:text-text-primary'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={cn(
              'h-3 w-3 transition-transform duration-300',
              collapsed && 'rotate-180'
            )}
            strokeWidth={2.5}
          />
        </button>
      </aside>
    </>
  );
}
