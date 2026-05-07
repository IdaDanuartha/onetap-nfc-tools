import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClipboardList, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceList } from '@/components/nfc/attendance-list';

export default async function AttendanceDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch all logs for this user (multi-tenant)
  // Currently, logs aren't linked to user_id directly, but we can filter by tags owned by user
  const { data: userTags } = await supabase
    .from('attendance_tags')
    .select('token')
    .eq('created_by', user.id);
  
  const userTokens = userTags?.map(t => t.token) || [];

  const { data: logs } = await supabase
    .from('attendance_logs')
    .select('*')
    .in('token', userTokens)
    .order('tapped_at', { ascending: false });

  // Stats
  const totalLogs = logs?.length || 0;
  const waSuccess = logs?.filter(l => l.wa_sent).length || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <ClipboardList className="w-7 h-7 text-primary" />
            ATTENDANCE LOGS
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Pantau kehadiran peserta lintas instansi secara real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-20 h-20" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Total Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tighter">{totalLogs}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> WA Terkirim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tighter text-emerald-500">{waSuccess}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" /> WA Gagal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black tracking-tighter text-amber-500">{totalLogs - waSuccess}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Data Real-time</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AttendanceList initialLogs={logs || []} />
        </CardContent>
      </Card>
    </div>
  );
}
