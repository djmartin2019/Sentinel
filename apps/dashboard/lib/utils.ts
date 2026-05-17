import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { TargetStatus, IncidentSeverity } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatUptime(percent: number): string {
  return `${percent.toFixed(2)}%`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function getStatusColor(status: TargetStatus): string {
  switch (status) {
    case 'UP': return 'text-status-up';
    case 'DOWN': return 'text-status-down';
    case 'DEGRADED': return 'text-status-degraded';
  }
}

export function getSeverityColor(severity: IncidentSeverity): string {
  switch (severity) {
    case 'critical': return 'text-severity-critical';
    case 'warning': return 'text-severity-warning';
    case 'info': return 'text-severity-info';
  }
}

export function getLatencyColor(ms: number): string {
  if (ms < 200) return 'text-status-up';
  if (ms < 800) return 'text-status-degraded';
  return 'text-status-down';
}
