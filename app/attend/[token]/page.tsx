'use client';

import { useState, useEffect, use } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Calendar, Clock, MapPin, Share2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AttendancePageProps {
  params: Promise<{ token: string }>;
}

export default function AttendancePage({ params }: AttendancePageProps) {
  const { token } = use(params);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<{
    studentName: string;
    className: string;
    subject: string | null;
    date: string;
    time: string;
    waSent: boolean;
  } | null>(null);

  useEffect(() => {
    async function processAttendance() {
      try {
        const res = await fetch(`/api/attendance/${token}`, { method: 'POST' });
        const result = await res.json();

        if (res.ok && result.success) {
          setData(result);
          setStatus('success');
        } else {
          setErrorMessage(result.error || 'Gagal mencatat kehadiran.');
          setStatus('error');
        }
      } catch (err) {
        setErrorMessage('Gangguan koneksi server.');
        setStatus('error');
      }
    }
    processAttendance();
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="text-center space-y-6">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mencatat Kehadiran</h2>
            <p className="text-sm text-slate-500 animate-pulse">Mohon jangan tutup halaman ini...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-950/20 p-6">
        <Card className="w-full max-w-sm border-2 border-red-100 dark:border-red-900/30 shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <AlertCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">Oops! Gagal</h2>
              <p className="text-slate-600 dark:text-slate-400">{errorMessage}</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-all shadow-lg shadow-red-600/20"
            >
              Coba Lagi
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-slate-950 dark:to-slate-900 p-6">
      <Card className="w-full max-w-md border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl">
        <div className="h-2 bg-emerald-500 w-full" />
        <CardContent className="p-0">
          {/* Header Success */}
          <div className="bg-emerald-500 p-8 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-40 h-40 bg-black/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-xl animate-bounce-short">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight">Hadir!</h1>
                <p className="text-emerald-50 font-medium">Kehadiran Berhasil Tercatat</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight leading-tight">
                  {data?.studentName}
                </h2>
                <Badge variant="outline" className="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  {data?.className}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tanggal</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{data?.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Waktu</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{data?.time} WIB</p>
                  </div>
                </div>

                {data?.subject && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mata Pelajaran</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{data?.subject}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* WA Status */}
            <div className={cn(
              "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all",
              data?.waSent 
                ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                : "bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-700 dark:text-amber-400"
            )}>
              <div className={cn(
                "w-3 h-3 rounded-full",
                data?.waSent ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )} />
              <p className="text-xs font-bold uppercase tracking-wide">
                {data?.waSent ? 'Notifikasi WA Terkirim ke Guru' : 'Gagal Mengirim Notifikasi WA'}
              </p>
            </div>

            <div className="text-center pt-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">OneTap NFC Attendance System</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
