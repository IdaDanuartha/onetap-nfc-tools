'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/activity-logger';
import { clearTag } from '@/lib/nfc-service';
import { toast } from 'sonner';
import type { NfcTag, NfcTagStatus } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from '@/lib/utils';

interface TagsTableProps {
  initial: NfcTag[];
  userId: string;
  userEmail: string;
  userName: string;
}

export function TagsTable({ initial, userId, userEmail, userName }: TagsTableProps) {
  const [tags, setTags] = useState<NfcTag[]>(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('nfc_tags')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTags(data as NfcTag[]);
  }, []);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('nfc_tags_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nfc_tags' }, () => {
        void fetchTags();
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [fetchTags]);

  async function handleStatusChange(tag: NfcTag, newStatus: NfcTagStatus) {
    setLoading(tag.id);
    const supabase = createClient();

    const { error } = await supabase
      .from('nfc_tags')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tag.id);

    if (error) {
      toast.error('Failed to update status: ' + error.message);
      setLoading(null);
      return;
    }

    await logActivity({
      action: 'tag_status_changed',
      tagId: tag.id,
      performedBy: userId,
      metadata: {
        from: tag.status,
        to: newStatus,
        serial_number: tag.serial_number,
        performer_email: userEmail,
        performer_name: userName,
      },
    });

    toast.success(`Tag "${tag.label ?? tag.serial_number}" set to ${newStatus}.`);
    setLoading(null);
    void fetchTags();
  }

  async function handleClearTag(tag: NfcTag) {
    setLoading(tag.id);

    try {
      await clearTag();
    } catch {
      toast.error('Could not write to physical tag. Ensure this device supports Web NFC.');
      setLoading(null);
      return;
    }

    const supabase = createClient();
    await supabase.from('nfc_tags').delete().eq('id', tag.id);

    await logActivity({
      action: 'tag_cleared',
      tagId: tag.id,
      performedBy: userId,
      metadata: {
        serial_number: tag.serial_number,
        label: tag.label,
        performer_email: userEmail,
        performer_name: userName,
      },
    });

    toast.success(`Tag "${tag.label ?? tag.serial_number}" cleared and removed.`);
    setLoading(null);
    void fetchTags();
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-16 text-[hsl(var(--muted-foreground))]">
        <p className="text-sm">No NFC tags registered yet.</p>
        <p className="text-xs mt-1">Use the Scanner to register your first tag.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[hsl(var(--border))]">
            <th className="text-left py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Label</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden sm:table-cell">Serial Number</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Status</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">Assigned To</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden lg:table-cell">Last Scanned</th>
            <th className="text-right py-3 px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))]">
          {tags.map((tag) => (
            <tr key={tag.id} className="hover:bg-[hsl(var(--muted))]/40 transition-colors duration-100 group">
              <td className="py-3.5 px-4">
                <p className="font-medium text-[hsl(var(--foreground))]">{tag.label ?? '—'}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] sm:hidden font-mono">{tag.serial_number}</p>
              </td>
              <td className="py-3.5 px-4 hidden sm:table-cell">
                <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{tag.serial_number}</span>
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={tag.status} />
              </td>
              <td className="py-3.5 px-4 hidden md:table-cell text-[hsl(var(--muted-foreground))]">
                {tag.assigned_to ?? '—'}
              </td>
              <td className="py-3.5 px-4 hidden lg:table-cell text-[hsl(var(--muted-foreground))] text-xs">
                {tag.last_scanned_at ? formatDistanceToNow(tag.last_scanned_at) : 'Never'}
              </td>
              <td className="py-3.5 px-4 text-right">
                {loading === tag.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--muted-foreground))] ml-auto" />
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none">
                      <MoreHorizontal className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => handleStatusChange(tag, 'active')} disabled={tag.status === 'active'}>
                        <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                        Set Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(tag, 'inactive')} disabled={tag.status === 'inactive'}>
                        <XCircle className="w-4 h-4 mr-2 text-slate-400" />
                        Set Inactive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(tag, 'compromised')} disabled={tag.status === 'compromised'}>
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                        Mark Compromised
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        onClick={() => handleClearTag(tag)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear & Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
