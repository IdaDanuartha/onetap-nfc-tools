'use client';

import { useState, useEffect, use } from 'react';
import { Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface RedirectPageProps {
  params: Promise<{ token: string }>;
}

export default function RedirectPage({ params }: RedirectPageProps) {
  const { token } = use(params);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if link is protected or not on mount
  useEffect(() => {
    async function checkLink() {
      try {
        const res = await fetch(`/api/links/unlock/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: '' }), // Empty probe
        });
        
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        } else if (res.status !== 401) {
          setError('Link tidak valid atau telah kadaluarsa.');
          setChecking(false);
        } else {
          // Status 401 means it IS protected and needs password
          setChecking(false);
        }
      } catch (err) {
        setError('Terjadi kesalahan koneksi.');
        setChecking(false);
      }
    }
    checkLink();
  }, [token]);

  const handleUnlock = async () => {
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/links/unlock/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        setError('Password salah. Silakan coba lagi.');
        setLoading(false);
      }
    } catch (err) {
      setError('Gagal membuka link.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-[hsl(var(--muted-foreground))] animate-pulse">Menyiapkan pengalihan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 p-6">
      <Card className="w-full max-w-sm border-none shadow-2xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="h-2 bg-primary w-full" />
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Lock className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Link Terproteksi</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Konten ini dilindungi password. Masukkan password untuk melanjutkan.
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Masukkan Password"
                  className="h-12 text-center text-lg tracking-widest bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium animate-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleUnlock} 
                disabled={loading || !password}
                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 group"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Buka Link
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold pt-4">
              Powered by OneTap NFC
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
