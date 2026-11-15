import { Radio, AlertTriangle, Timer, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SummaryStats } from '@/lib/types';

type Tone = 'accent' | 'ok' | 'warn' | 'down';

const toneText: Record<Tone, string> = {
  accent: 'text-text-primary',
  ok: 'text-text-primary',
  warn: 'text-status-degraded',
  down: 'text-status-down',
};

const toneIcon: Record<Tone, string> = {
  accent: 'text-accent-cyan',
  ok: 'text-status-up',
  warn: 'text-status-degraded',
  down: 'text-status-down',
};

interface CardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: Tone;
  footnote: string;
}

function Card({ title, value, icon: Icon, tone = 'accent', footnote }: CardProps) {
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-muted">{title}</p>
        <Icon className={cn('h-4 w-4', toneIcon[tone])} strokeWidth={1.75} />
      </div>
      <p
        className={cn(
          'mt-3 font-mono text-[28px] font-semibold leading-none tracking-tight tabular-nums',
          toneText[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-text-muted">{footnote}</p>
    </div>
  );
}

export default function SummaryCards({ stats: s }: { stats: SummaryStats }) {
  const unhealthy = s.totalTargets - s.healthyTargets;
  const uptimeTone: Tone =
    s.avgUptimePercent >= 99.9 ? 'ok' : s.avgUptimePercent >= 99 ? 'warn' : 'down';

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card
        title="Targets up"
        icon={Radio}
        tone={unhealthy > 0 ? 'warn' : 'accent'}
        value={
          <>
            {s.healthyTargets}
            <span className="text-text-dim">/{s.totalTargets}</span>
          </>
        }
        footnote={unhealthy > 0 ? `${unhealthy} degraded or down` : 'All passing'}
      />
      <Card
        title="Active incidents"
        icon={AlertTriangle}
        tone={s.activeIncidents > 0 ? 'down' : 'ok'}
        value={s.activeIncidents}
        footnote={s.activeIncidents > 0 ? 'Needs attention' : 'Nothing open'}
      />
      <Card
        title="Uptime · 30d"
        icon={ShieldCheck}
        tone={uptimeTone}
        value={`${s.avgUptimePercent.toFixed(2)}%`}
        footnote="Average across targets"
      />
      <Card
        title="Avg latency"
        icon={Timer}
        tone={s.avgLatencyMs >= 800 ? 'warn' : 'accent'}
        value={
          <>
            {s.avgLatencyMs}
            <span className="ml-0.5 text-base text-text-muted">ms</span>
          </>
        }
        footnote="Latest check, reachable targets"
      />
    </div>
  );
}
