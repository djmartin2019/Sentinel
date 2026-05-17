import { Radio, CheckCircle, AlertTriangle, Timer, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SummaryStats } from '@/lib/queries';

interface CardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral'; positive?: boolean };
  accent?: 'cyan' | 'green' | 'red' | 'amber';
  description?: string;
}

const accentMap = {
  cyan: {
    icon: 'text-accent-cyan',
    iconBg: 'bg-accent-cyan/8 border-accent-cyan/20',
    value: 'text-accent-cyan',
    glow: 'hover:shadow-[0_0_20px_rgba(34,211,238,0.07)]',
  },
  green: {
    icon: 'text-status-up',
    iconBg: 'bg-status-up/8 border-status-up/20',
    value: 'text-status-up',
    glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.07)]',
  },
  red: {
    icon: 'text-status-down',
    iconBg: 'bg-status-down/8 border-status-down/20',
    value: 'text-status-down',
    glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.07)]',
  },
  amber: {
    icon: 'text-status-degraded',
    iconBg: 'bg-status-degraded/8 border-status-degraded/20',
    value: 'text-status-degraded',
    glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.07)]',
  },
};

function Card({ title, value, icon: Icon, trend, accent = 'cyan', description }: CardProps) {
  const a = accentMap[accent];
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div className={cn('relative p-4 rounded border border-border bg-bg-card transition-all duration-200', a.glow)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-widest text-text-muted mb-2">{title}</p>
          <p className={cn('text-2xl font-bold font-mono tabular-nums tracking-tight', a.value)}>{value}</p>
          {description && (
            <p className="text-[11px] text-text-muted mt-1.5 truncate">{description}</p>
          )}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-[11px] font-medium', trend.positive ? 'text-status-up' : trend.direction === 'neutral' ? 'text-text-muted' : 'text-status-down')}>
              <TrendIcon className="w-3 h-3" strokeWidth={2.5} />
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={cn('flex items-center justify-center w-9 h-9 rounded border shrink-0', a.iconBg)}>
          <Icon className={cn('w-4 h-4', a.icon)} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

interface SummaryCardsProps {
  stats: SummaryStats;
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
  const s = stats;
  const healthPct =
    s.totalTargets > 0 ? Math.round((s.healthyTargets / s.totalTargets) * 100) : 0;
  const unhealthy = s.totalTargets - s.healthyTargets;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card
        title="Total Targets"
        value={s.totalTargets}
        icon={Radio}
        accent="cyan"
        description={`${s.totalTargets} monitored endpoints`}
      />
      <Card
        title="Healthy"
        value={s.healthyTargets}
        icon={CheckCircle}
        accent="green"
        description={`${healthPct}% passing checks`}
        trend={{
          value: `${unhealthy} degraded or down`,
          direction: 'neutral',
        }}
      />
      <Card
        title="Active Incidents"
        value={s.activeIncidents}
        icon={AlertTriangle}
        accent={s.activeIncidents > 0 ? 'red' : 'green'}
        description="Requires attention"
      />
      <Card
        title="Avg Latency"
        value={`${s.avgLatencyMs}ms`}
        icon={Timer}
        accent="cyan"
        description={`${s.avgUptimePercent}% avg uptime`}
      />
    </div>
  );
}
