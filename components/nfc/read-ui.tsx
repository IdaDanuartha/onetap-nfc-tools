'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, readDetailedTag } from '@/lib/nfc-service';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { DetailedNfcReadResult } from '@/lib/types';
import { Wifi, AlertCircle, Loader2, Database, Fingerprint, FileCode, Search, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface ReadUIProps {
  userId: string;
}

export function ReadUI({ userId }: ReadUIProps) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'unsupported' | 'error'>('idle');
  const [result, setResult] = useState<DetailedNfcReadResult | null>(null);
  const [dbRecord, setDbRecord] = useState<any | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNFCSupported()) setStatus('unsupported');
    return () => { cleanupRef.current?.(); };
  }, []);

  async function startScan() {
    if (!isNFCSupported()) return;
    
    setStatus('scanning');
    setResult(null);
    setDbRecord(null);

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
            .single();
            
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
            metadata: {
              action_detail: 'Deep Read & DB Cross-reference',
              serialNumber: data.serialNumber,
              bytes: data.messageBytes,
              recordCount: data.recordCount,
            }
          });
          toast.success('Tag read successfully');
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
      toast.error('Failed to start reader');
    }
  }

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
      {/* Top Banner CTA */}
      <Card className={cn("transition-colors overflow-hidden border", status === 'scanning' ? "border-primary" : "border-border")}>
        <div className="relative p-6 flex flex-col items-center justify-center text-center">
          {status === 'scanning' && (
             <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          )}
          
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform", 
              status === 'scanning' ? "bg-primary text-primary-foreground animate-bounce" : "bg-card border-2 border-border text-foreground"
            )}>
               {status === 'scanning' ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">
                {status === 'scanning' ? 'Scanning...' : 'Deep Read Tag'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status === 'scanning' 
                  ? 'Hold your device near any NFC chip' 
                  : 'Extract detailed hardware, payloads, and Supabase data.'}
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              {(status === 'idle' || status === 'success' || status === 'error') && (
                <Button onClick={startScan} size="lg" className="px-8 shadow-sm">
                  {status === 'success' ? 'Scan Another' : 'Start Reading'}
                </Button>
              )}
              {status === 'scanning' && (
                <Button variant="outline" size="lg" onClick={() => {
                  cleanupRef.current?.();
                  setStatus('idle');
                }}>
                  Cancel Scan
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Result Area */}
      {status === 'success' && result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Database Match Section */}
          {dbRecord ? (
            <Card className="border-emerald-500/50 bg-emerald-500/5 shadow-md">
              <div className="bg-emerald-500/10 px-4 py-2 border-b border-emerald-500/20 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wide uppercase">Verified Database Tag</span>
              </div>
              <CardContent className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                   <div>
                     <p className="text-xs text-muted-foreground font-medium uppercase mb-0.5">Assigned Label</p>
                     <p className="text-xl font-bold text-foreground">{dbRecord.label}</p>
                   </div>
                   <StatusBadge status={dbRecord.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-background/50 p-3 rounded-lg border border-border/50">
                   <div>
                     <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5 flex gap-1 items-center"><User className="w-3 h-3"/> Assigned To</p>
                     <p className="text-sm font-medium">{dbRecord.assigned_to || 'None'}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-muted-foreground font-medium uppercase mb-0.5 flex gap-1 items-center"><Wifi className="w-3 h-3"/> Last Scanned</p>
                     <p className="text-sm font-medium">{new Date(dbRecord.last_scanned_at || dbRecord.registered_at).toLocaleDateString()}</p>
                   </div>
                </div>

                {dbRecord.payload_data && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Database Sync Payload</p>
                    <pre className="text-xs bg-card border border-border/40 p-3 rounded-md font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed shadow-inner">
                      {JSON.stringify(dbRecord.payload_data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-500/50 bg-amber-500/5 border-dashed">
              <CardContent className="p-4 flex items-center gap-3">
                 <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
                 <div>
                   <p className="font-semibold text-amber-700 dark:text-amber-400">Unregistered Generic Tag</p>
                   <p className="text-xs text-amber-600/80 dark:text-amber-500/80">This hardware UID is not tracked in your Supabase 'nfc_tags' inventory. You can register it in the Verification tab.</p>
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Hardware Metrics Section */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex gap-3 items-center">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><Fingerprint className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Hardware UID</p>
                  <p className="font-mono text-sm">{result.serialNumber}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 flex gap-3 items-center">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Database className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Payload Size</p>
                  <p className="text-sm font-semibold">{result.messageBytes > 0 ? `${result.messageBytes} Bytes` : 'Empty'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 lg:col-span-1">
              <CardContent className="p-4 flex gap-3 items-center">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><FileCode className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Records Count</p>
                  <p className="text-sm font-semibold">{result.recordCount} NDEF Records</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
             <h3 className="font-semibold px-1 text-sm tracking-wide text-muted-foreground">RAW NDEF CHIP RECORDS</h3>
             {result.records.length === 0 && (
               <Card className="bg-muted/30 border-dashed"><CardContent className="p-6 text-center text-sm text-muted-foreground">No records found on this tag.</CardContent></Card>
             )}
             {result.records.map((record, i) => (
                <Card key={i} className="overflow-hidden border-border/70">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border/40 flex justify-between items-center text-[11px]">
                    <span className="font-bold text-foreground uppercase tracking-wider">Record #{i+1} : {record.recordType}</span>
                    <span className="text-muted-foreground font-mono">{record.byteLength} Bytes</span>
                  </div>
                  <CardContent className="p-4">
                    {record.mediaType && (
                       <p className="text-[11px] text-muted-foreground mb-2 border-b border-border/50 pb-2">MIME Target: <span className="font-mono text-foreground font-semibold">{record.mediaType}</span></p>
                    )}
                    <pre className="text-[13px] bg-card border border-border/30 p-3 rounded-md font-mono whitespace-pre-wrap overflow-x-auto text-foreground/90 leading-relaxed shadow-inner">
                      {record.data || '[Empty/Binary record body]'}
                    </pre>
                  </CardContent>
                </Card>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
