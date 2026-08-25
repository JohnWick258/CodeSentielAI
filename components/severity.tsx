import { cn } from '@/lib/utils';
import type { Severity, FindingStatus } from '@/lib/security/types';

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const styles: Record<Severity, string> = {
    CRITICAL: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30',
    HIGH: 'bg-severity-high/15 text-severity-high border-severity-high/30',
    MEDIUM: 'bg-severity-medium/15 text-severity-medium border-severity-medium/30',
    LOW: 'bg-severity-low/15 text-severity-low border-severity-low/30',
    INFO: 'bg-severity-info/15 text-severity-info border-severity-info/30',
  };
  const dot: Record<Severity, string> = {
    CRITICAL: 'bg-severity-critical',
    HIGH: 'bg-severity-high',
    MEDIUM: 'bg-severity-medium',
    LOW: 'bg-severity-low',
    INFO: 'bg-severity-info',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        styles[severity],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[severity])} />
      {severity}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: FindingStatus; className?: string }) {
  const styles: Record<FindingStatus, string> = {
    OPEN: 'bg-severity-high/10 text-severity-high border-severity-high/20',
    CONFIRMED: 'bg-primary/10 text-primary border-primary/20',
    FALSE_POSITIVE: 'bg-muted text-muted-foreground border-border',
    FIXED: 'bg-severity-low/10 text-severity-low border-severity-low/20',
    IGNORED: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', styles[status], className)}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? 'bg-severity-critical' : pct >= 70 ? 'bg-severity-high' : 'bg-severity-medium';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
