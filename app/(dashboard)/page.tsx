import { createClient } from '@/lib/supabase/server';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { Tags, Wifi, CheckCircle, Users, ScanLine } from 'lucide-react';
import Link from 'next/link';
import type { ActivityLog } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Parallel data fetching
  const [
    { count: totalTags },
    { count: activeTags },
    { count: scannedToday },
    { data: activityLogs },
  ] = await Promise.all([
    supabase.from('nfc_tags').select('*', { count: 'exact', head: true }),
    supabase
      .from('nfc_tags')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('nfc_tags')
      .select('*', { count: 'exact', head: true })
      .gte('last_scanned_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from('activity_logs')
      .select('*, nfc_tag:nfc_tags(id, serial_number, label)')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // Approximate active admins by counting unique recent actors in activity logs
  const { data: recentActors } = await supabase
    .from('activity_logs')
    .select('performed_by')
    .limit(100);
  const activeAdmins = recentActors
    ? new Set(recentActors.map((a) => a.performed_by).filter(Boolean)).size
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Monitor and manage your NFC tags in real time.
          </p>
        </div>

        <Link
          href="/scanner"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all duration-200"
        >
          <ScanLine className="w-4 h-4" />
          <span className="hidden sm:inline">Scan Tag</span>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Tags"
          value={totalTags ?? 0}
          icon={Tags}
          description="Registered NFC tags"
          accent="blue"
        />
        <StatsCard
          label="Active"
          value={activeTags ?? 0}
          icon={CheckCircle}
          description="Tags currently active"
          accent="green"
        />
        <StatsCard
          label="Scanned Today"
          value={scannedToday ?? 0}
          icon={Wifi}
          description="Tags read today"
          accent="amber"
        />
        <StatsCard
          label="Active Admins"
          value={activeAdmins || 1}
          icon={Users}
          description="Based on recent logs"
          accent="default"
        />
      </div>

      {/* Activity Feed */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div>
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Activity Log</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Live admin actions — updates in real time</p>
          </div>
          <Link
            href="/tags"
            className="text-xs text-primary hover:underline font-medium transition-colors cursor-pointer"
          >
            View tags →
          </Link>
        </div>
        <div className="px-5 py-2 max-h-[420px] overflow-y-auto">
          <ActivityFeed initial={(activityLogs ?? []) as ActivityLog[]} />
        </div>
      </div>
    </div>
  );
}
