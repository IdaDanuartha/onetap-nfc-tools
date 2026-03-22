import type { NfcTagStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: NfcTagStatus;
  className?: string;
}

const config: Record<NfcTagStatus, { label: string; classes: string; dot: string }> = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  inactive: {
    label: 'Inactive',
    classes: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    dot: 'bg-slate-400',
  },
  compromised: {
    label: 'Compromised',
    classes: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    dot: 'bg-red-500',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, classes, dot } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        classes,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {label}
    </span>
  );
}
