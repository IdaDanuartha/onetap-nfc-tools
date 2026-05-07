'use client';

import { useState } from 'react';
import { Search, Building2, User, Clock, Filter, X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttendanceLog {
  id: string;
  tapped_at: string;
  student_name: string;
  school_name: string;
  class_name: string;
  wa_sent: boolean;
}

type DateRange = 'all' | 'today' | 'week' | 'month' | 'year';

export function AttendanceList({ initialLogs }: { initialLogs: AttendanceLog[] }) {
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  
  // Get unique schools for filter
  const schools = Array.from(new Set(initialLogs.map(log => log.school_name))).filter(Boolean);

  const filteredLogs = initialLogs.filter(log => {
    const logDate = new Date(log.tapped_at);
    const now = new Date();
    
    // 1. Search Filter
    const matchesSearch = 
      log.student_name.toLowerCase().includes(search.toLowerCase()) ||
      log.class_name.toLowerCase().includes(search.toLowerCase()) ||
      log.school_name.toLowerCase().includes(search.toLowerCase());
    
    // 2. School Filter
    const matchesSchool = schoolFilter === '' || log.school_name === schoolFilter;

    // 3. Date Range Filter
    let matchesDate = true;
    if (dateRange === 'today') {
      matchesDate = logDate.toDateString() === now.toDateString();
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      matchesDate = logDate >= weekAgo;
    } else if (dateRange === 'month') {
      matchesDate = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    } else if (dateRange === 'year') {
      matchesDate = logDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesSchool && matchesDate;
  });

  const rangeLabels: { id: DateRange; label: string }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'today', label: 'Hari Ini' },
    { id: 'week', label: '7 Hari' },
    { id: 'month', label: 'Bulan Ini' },
    { id: 'year', label: 'Tahun Ini' },
  ];

  return (
    <div className="space-y-6">
      {/* Search & School Filter Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Cari peserta, kelas, atau instansi..." 
            className="pl-9 h-11 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            className="h-11 px-4 rounded-xl bg-muted font-bold text-xs outline-none focus:ring-2 focus:ring-primary/20 border-r-8 border-transparent"
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
          >
            <option value="">Semua Instansi</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
        {rangeLabels.map((range) => (
          <button
            key={range.id}
            onClick={() => setDateRange(range.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
              dateRange === range.id 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/40 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Waktu</th>
              <th className="px-6 py-4">Instansi</th>
              <th className="px-6 py-4">Nama Peserta</th>
              <th className="px-6 py-4">Grup / Kelas</th>
              <th className="px-6 py-4">Status WA</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-6 py-4 font-mono text-[11px] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div>
                      <p className="font-bold text-foreground">
                        {new Date(log.tapped_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(log.tapped_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <Building2 className="w-3 h-3" />
                    </div>
                    <span className="font-bold text-[10px] uppercase tracking-tight">{log.school_name || 'Umum'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex items-center gap-2">
                     <User className="w-3 h-3 text-muted-foreground" />
                     <span className="font-bold text-slate-900 dark:text-slate-100">{log.student_name}</span>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black border border-slate-200 dark:border-slate-700">
                    {log.class_name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {log.wa_sent ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full w-fit border border-emerald-100 dark:border-emerald-900/30">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-black text-[9px] uppercase tracking-tighter">SENT</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-full w-fit border border-red-100 dark:border-red-900/30">
                      <div className="w-1 h-1 rounded-full bg-red-500" />
                      <span className="font-black text-[9px] uppercase tracking-tighter">FAIL</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground/40">
                    <CalendarDays className="w-12 h-12 stroke-[1.5px]" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Tidak Ada Data</p>
                      <p className="text-xs">Coba ubah filter atau rentang tanggal Anda.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
