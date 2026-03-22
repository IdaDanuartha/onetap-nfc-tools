import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'default';
  className?: string;
}

const accentStyles = {
  blue: { icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', border: 'hover:border-blue-200 dark:hover:border-blue-500/30' },
  green: { icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', border: 'hover:border-emerald-200 dark:hover:border-emerald-500/30' },
  amber: { icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', border: 'hover:border-amber-200 dark:hover:border-amber-500/30' },
  red: { icon: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400', border: 'hover:border-red-200 dark:hover:border-red-500/30' },
  default: { icon: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400', border: '' },
};

export function StatsCard({ label, value, icon: Icon, description, accent = 'default', className }: StatsCardProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        'group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 transition-all duration-200 hover:shadow-md',
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))] leading-none">{value}</p>
          {description && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{description}</p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg shrink-0', styles.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
