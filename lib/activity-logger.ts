import { createClient } from '@/lib/supabase/client';
import type { ActivityAction } from '@/lib/types';

interface LogActivityParams {
  action: ActivityAction;
  tagId?: string | null;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert an activity log entry into the `activity_logs` table.
 * Every admin action (register, write, clear, status change, scan) should
 * be recorded with the performing admin's user ID.
 */
export async function logActivity({
  action,
  tagId,
  performedBy,
  metadata = {},
}: LogActivityParams): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('activity_logs').insert({
    action,
    tag_id: tagId ?? null,
    performed_by: performedBy,
    metadata,
  });

  if (error) {
    // Non-fatal — log to console but don't throw to avoid breaking main flows
    console.error('[ActivityLogger] Failed to log activity:', error.message);
  }
}
