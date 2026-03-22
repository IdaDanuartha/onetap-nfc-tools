'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from '@/lib/utils';
import {
  Tag,
  Wifi,
  Trash2,
  ToggleLeft,
  ScanLine,
  Activity,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const actionConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  tag_registered: { label: 'Registered tag', icon: Tag, color: 'text-blue-500 bg-blue-500/10' },
  tag_written: { label: 'Wrote to tag', icon: Wifi, color: 'text-indigo-500 bg-indigo-500/10' },
  tag_cleared: { label: 'Cleared tag', icon: Trash2, color: 'text-amber-500 bg-amber-500/10' },
  tag_status_changed: { label: 'Changed tag status', icon: ToggleLeft, color: 'text-purple-500 bg-purple-500/10' },
  tag_scanned: { label: 'Scanned tag', icon: ScanLine, color: 'text-emerald-500 bg-emerald-500/10' },
};

interface ActivityFeedProps {
  initial: ActivityLog[];
}

export function ActivityFeed({ initial }: ActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initial);

  const fetchLogs = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('activity_logs')
      .select('*, nfc_tag:nfc_tags(id, serial_number, label)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setLogs(data as ActivityLog[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('activity_logs_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        () => { void fetchLogs(); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchLogs]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[hsl(var(--muted-foreground))]">
        <Activity className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <ul className="space-y-0 divide-y divide-[hsl(var(--border))]">
      {logs.map((log, idx) => {
        const cfg = actionConfig[log.action] ?? { label: log.action, icon: Activity, color: 'text-slate-500 bg-slate-500/10' };
        const Icon = cfg.icon;

        const performerEmail = (log.metadata?.performer_email as string) ?? 'Unknown';
        const performerName = (log.metadata?.performer_name as string) ?? performerEmail;
        const initials = performerName.slice(0, 2).toUpperCase();
        const tagLabel = log.nfc_tag?.label ?? log.nfc_tag?.serial_number ?? (log.metadata?.serial_number as string) ?? '—';

        return (
          <li
            key={log.id}
            className={cn(
              'flex items-start gap-3 py-3.5 px-1 group animate-fade-in',
              idx === 0 && 'pt-1'
            )}
          >
            {/* Action icon */}
            <div className={cn('p-1.5 rounded-lg shrink-0 mt-0.5', cfg.color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[hsl(var(--foreground))]">
                <span className="font-medium">{cfg.label}</span>
                {' — '}
                <span className="text-[hsl(var(--muted-foreground))] font-mono text-xs">{tagLabel}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-[8px] bg-blue-700 text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{performerName}</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0">
                  {formatDistanceToNow(log.created_at)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
