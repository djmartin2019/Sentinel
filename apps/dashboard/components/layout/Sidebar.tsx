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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen border-r transition-all duration-300 ease-in-out shrink-0',
        'border-border bg-bg-surface',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 py-4 border-b border-border', collapsed && 'justify-center px-0')}>
        <div className="flex items-center justify-center w-7 h-7 rounded bg-accent-cyan/10 border border-accent-cyan/30 shrink-0">
          <Zap className="w-3.5 h-3.5 text-accent-cyan" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wider text-text-primary uppercase">
            Sentinel
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded text-sm transition-all duration-150 group',
                active
                  ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border border-transparent',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  active ? 'text-accent-cyan' : 'text-text-muted group-hover:text-text-secondary'
                )}
                strokeWidth={1.75}
              />
              {!collapsed && <span className="truncate">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-accent-cyan" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status indicator */}
      {!collapsed && (
        <div className="mx-2 mb-2 px-3 py-2.5 rounded border border-border bg-bg-card">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-up opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-up" />
            </span>
            <span>All systems operational</span>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-[60px] z-10',
          'flex items-center justify-center w-6 h-6 rounded-full',
          'bg-bg-elevated border border-border text-text-muted',
          'hover:text-text-primary hover:border-accent-cyan/50 transition-colors'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          className={cn('w-3 h-3 transition-transform duration-300', collapsed && 'rotate-180')}
          strokeWidth={2.5}
        />
      </button>
    </aside>
  );
}
