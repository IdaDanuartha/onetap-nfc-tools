'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, readDetailedTag } from '@/lib/nfc-service';
import { decryptData } from '@/lib/crypto';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { DetailedNfcReadResult } from '@/lib/types';
import { Wifi, AlertCircle, Loader2, Database, Fingerprint, FileCode, Search, ShieldCheck, User, Lock, Unlock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NfcPasswordModal } from '@/components/nfc/nfc-password-modal';

interface ReadUIProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function ReadUI({ userId, userEmail, userName }: ReadUIProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'unsupported' | 'error'>('idle');
  const [result, setResult] = useState<DetailedNfcReadResult | null>(null);
  const [dbRecord, setDbRecord] = useState<any | null>(null);
  
  // Decryption state
  const [decryptPasswords, setDecryptPasswords] = useState<Record<number, string>>({});
  const [decryptedRecords, setDecryptedRecords] = useState<Record<number, string>>({});

  // A2: NFC operation password gate
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNFCSupported()) setStatus('unsupported');

    // Fetch password enabled status
    fetch('/api/nfc/password-status')
      .then((r) => r.json())
      .then((d) => setPasswordEnabled(d.enabled ?? false))
      .catch(() => {});

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const startScan = async () => {
    setStatus('scanning');
    setResult(null);
    setDbRecord(null);
    setDecryptedRecords({});
    setDecryptPasswords({});

    try {
      const cleanup = await readDetailedTag(
        async (data) => {
          setStatus('success');
          setResult(data);
          cleanupRef.current?.();
          
          // Cross-reference Supabase DB
          const supabase = createClient();
          const { data: dbInstance } = await supabase
            .from('nfc_tags')
            .select('*')
            .eq('serial_number', data.serialNumber)
            .maybeSingle();
            
          setDbRecord(dbInstance || null);

          if (dbInstance) {
            // Update last scanned
            await supabase
              .from('nfc_tags')
              .update({ last_scanned_at: new Date().toISOString() })
              .eq('id', dbInstance.id);
          }

          await logActivity({
            action: 'tag_scanned',
            tagId: dbInstance?.id || null,
            performedBy: userId,
            metadata: { serial: data.serialNumber }
          });
          toast.success('Tag berhasil dibaca');
        },
        (error) => {
          setStatus('error');
          toast.error(error.message);
          cleanupRef.current?.();
        }
      );
      cleanupRef.current = cleanup;
    } catch (err) {
      setStatus('error');
      toast.error('Gagal menjalankan scanner');
    }
  }

  const handleScan = () => {
    if (passwordEnabled) {
      setShowPasswordModal(true);
    } else {
      startScan();
    }
  };

  const handlePasswordVerified = () => {
    setShowPasswordModal(false);
    startScan();
  };

  const handleDecrypt = async (index: number, encryptedPayload: string) => {
    try {
      const plainText = await decryptData(encryptedPayload, decryptPasswords[index] || '');
      setDecryptedRecords(prev => ({ ...prev, [index]: plainText }));
      toast.success('Record decrypted successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Decryption failed');
    }
  };

  if (status === 'unsupported') {
    return (
      <Card className="border-amber-500/20 bg-amber-500/10">
         <CardContent className="p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Web NFC is only available on Android Chrome. 
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <NfcPasswordModal 
        isOpen={showPasswordModal}
        operation="read"
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordVerified}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
            <Search className="w-7 h-7 text-primary" />
            READ NFC TAG
          </h1>
          <p className="text-sm text-muted-foreground font-medium">Dekatkan perangkat ke tag NFC untuk membaca data.</p>
        </div>
        <Badge 
          variant={status === 'success' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
          className="rounded-lg px-3 py-1 font-black uppercase text-[10px] tracking-widest"
        >
          {status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardContent className="p-8 text-center space-y-6">
            <div className={cn(
              "w-32 h-32 rounded-full mx-auto flex items-center justify-center transition-all duration-500 shadow-2xl",
              status === 'scanning' ? "bg-primary animate-pulse scale-110 shadow-primary/40" : "bg-muted"
            )}>
              <Wifi className={cn(
                "w-16 h-16 transition-all duration-500",
                status === 'scanning' ? "text-primary-foreground rotate-12" : "text-muted-foreground"
              )} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-tight">
                {status === 'scanning' ? 'Scanning...' : 'Siap Membaca'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status === 'scanning' ? 'Tempelkan kartu ke bagian belakang HP Anda' : 'Klik tombol di bawah untuk mulai'}
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={handleScan} 
              disabled={status === 'scanning'}
              className="w-full h-14 rounded-2xl font-black text-lg gap-3 shadow-xl shadow-primary/20"
            >
              {status === 'scanning' ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  MENUNGGU TAG...
                </>
              ) : (
                <>
                  <Fingerprint className="w-6 h-6" />
                  MULAI SCAN
                </>
              )}
            </Button>
            
            {status === 'scanning' && (
              <Button 
                variant="ghost" 
                onClick={() => { setStatus('idle'); cleanupRef.current?.(); }}
                className="w-full font-bold text-muted-foreground"
              >
                Batalkan
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Result details... (rest of the component remains the same) */}
          {result && (
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden animate-in slide-in-from-right-10 duration-500">
               <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Serial Number</p>
                      <p className="text-lg font-black font-mono tracking-tighter">{result.serialNumber}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-lg font-black uppercase text-[10px] px-3">{result.recordCount} RECORDS</Badge>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-2xl border border-border/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-2">
                       <FileCode className="w-3.5 h-3.5" /> Records Found ({result.records.length})
                    </p>
                    <div className="space-y-3">
                      {result.records.map((record, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className="h-5 px-1.5 text-[9px] font-black uppercase">{record.recordType}</Badge>
                          </div>
                          <div className="font-mono text-xs break-all bg-card/80 p-3 rounded-xl border border-border/10 shadow-inner">
                            {record.data}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {dbRecord && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in zoom-in duration-300">
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-3">
                         <Database className="w-3.5 h-3.5" /> Database Match
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black tracking-tight leading-tight">{dbRecord.label}</p>
                          <p className="text-xs font-bold text-muted-foreground">Status: <span className="text-primary uppercase">{dbRecord.status}</span></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!result && status !== 'scanning' && (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-50">
               <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                 <Search className="w-10 h-10 text-muted-foreground" />
               </div>
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Belum ada data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
