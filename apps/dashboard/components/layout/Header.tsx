import { Bell, RefreshCw, Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const now = new Date().toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-base font-semibold text-text-primary tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-mono">
          <Clock className="w-3 h-3" />
          <span>{now}</span>
        </div>

        <div className="h-4 w-px bg-border" />

        <button
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent-cyan border border-border hover:border-accent-cyan/40 rounded transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className="w-3 h-3" strokeWidth={2} />
          <span>Refresh</span>
        </button>

        <button
          className="relative flex items-center justify-center w-8 h-8 rounded border border-border text-text-muted hover:text-text-primary hover:border-border transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-status-down" />
        </button>
      </div>
    </header>
  );
}
