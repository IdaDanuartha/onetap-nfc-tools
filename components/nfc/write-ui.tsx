'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, writeCustomRecord } from '@/lib/nfc-service';
import { encryptData } from '@/lib/crypto';
import { logActivity } from '@/lib/activity-logger';
import { generateProtectedLink } from '@/lib/link-protection'; // Error in client component, we'll use API
import { toast } from 'sonner';
import { 
  Wifi, Link as LinkIcon, Type, Loader2, AlertCircle, 
  PenSquare, Phone, MessageSquare, Mail, Database, 
  RefreshCcw, Eraser, Lock, Unlock, Layers, 
  ClipboardList, User, GraduationCap, Send, Clock,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NfcPasswordModal } from '@/components/nfc/nfc-password-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface WriteUIProps {
  userId: string;
  userEmail: string;
  userName: string;
}

type RecordType = 'url' | 'text' | 'phone' | 'sms' | 'email' | 'database' | 'attendance' | 'erase';

export function WriteUI({ userId, userEmail, userName }: WriteUIProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [recordType, setRecordType] = useState<RecordType>('url');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<string>('idle');
  
  // A2: Password gate
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // A3: Link Protection state
  const [useLinkProtection, setUseLinkProtection] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');

  // A4: Bulk Write state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<number | null>(null);
  const [bulkCount, setBulkCount] = useState(0);
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'waiting' | 'writing' | 'done'>('idle');
  const [bulkLog, setBulkLog] = useState<{ index: number; status: 'success' | 'error'; message: string }[]>([]);

  // A5: Attendance state
  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [msgTemplate, setMsgTemplate] = useState('✅ *Absensi OneTap*\n\nSiswa *{student_name}* hadir dalam kelas *{class_name}*\n📅 {date}\n🕐 {time} WIB');

  // Database mode state
  const [dbTags, setDbTags] = useState<any[]>([]);
  const [selectedDbTag, setSelectedDbTag] = useState('');

  // AES Security mode state (Original feature)
  const [isSecure, setIsSecure] = useState(false);
  const [payloadPassword, setPayloadPassword] = useState('');

  useEffect(() => {
    setIsSupported(isNFCSupported());
    
    // Fetch password enabled status (A2)
    fetch('/api/nfc/password-status')
      .then((r) => r.json())
      .then((d) => setPasswordEnabled(d.enabled ?? false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (recordType === 'database' && dbTags.length === 0) {
      const supabase = createClient();
      supabase.from('nfc_tags').select('id, label, serial_number, payload_data, status').eq('status', 'active').then(({data}) => {
        setDbTags(data || []);
      });
    }
  }, [recordType, dbTags.length]);

  // A4: Start Bulk Write
  async function handleBulkWrite() {
    setBulkStatus('waiting');
    setBulkCount(0);
    setBulkLog([]);
    
    const max = bulkTarget || Infinity;
    let currentCount = 0;

    // The bulk loop is handled by the user tapping.
    // We change status to 'waiting' and each success increments count.
    setStatus('waiting_for_tap');
  }

  function handleWriteClick() {
    if (passwordEnabled) {
      setShowPasswordModal(true);
    } else {
      initiateWrite();
    }
  }

  async function initiateWrite() {
    if (isBulkMode) {
      handleBulkWrite();
    } else {
      handleWriteStart();
    }
  }

  async function handleWriteStart() {
    // Validation
    if (recordType === 'attendance') {
      if (!studentName || !className || !teacherPhone) {
        toast.error('Lengkapi data absensi!');
        return;
      }
    } else if (recordType !== 'erase' && !data.trim() && recordType !== 'database') {
      toast.error('Masukkan data payload.');
      return;
    }

    setStatus('waiting_for_tap');
    
    try {
      let finalData = data;
      let nfcRecordType: 'url' | 'text' | 'json' | 'erase' = 'url';

      // A3: Link Protection Logic
      if (useLinkProtection && recordType === 'url') {
        const res = await fetch('/api/links/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalUrl: data,
            password: linkPassword,
          }),
        });
        const result = await res.json();
        if (result.success) {
          finalData = result.url;
        } else {
          throw new Error('Gagal membuat link terproteksi');
        }
      } 
      // A5: Attendance Logic
      else if (recordType === 'attendance') {
        const res = await fetch('/api/attendance/create-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_name: studentName,
            school_name: schoolName,
            class_name: className,
            subject,
            teacher_phone: teacherPhone,
            message_template: msgTemplate
          }),
        });
        const result = await res.json();
        if (result.success) {
          finalData = result.url;
        } else {
          throw new Error('Gagal mendaftarkan tag absensi');
        }
      }
      else if (recordType === 'erase') {
        nfcRecordType = 'erase';
        finalData = '';
      } else if (recordType === 'url') {
        if (!finalData.startsWith('http')) finalData = `https://${finalData}`;
      } else if (recordType === 'text') {
        nfcRecordType = 'text';
      } else if (recordType === 'phone') {
        finalData = `tel:${finalData.replace(/[^0-9+]/g, '')}`;
      } else if (recordType === 'sms') {
        finalData = `sms:${finalData.replace(/[^0-9+]/g, '')}`;
      } else if (recordType === 'email') {
        finalData = `mailto:${finalData.trim()}`;
      } else if (recordType === 'database') {
        nfcRecordType = 'json';
      }

      // AES Encryption (Legacy feature)
      if (isSecure && recordType !== 'erase') {
        finalData = await encryptData(finalData, payloadPassword);
        nfcRecordType = 'text';
      }

      // Physical Write
      await writeCustomRecord(nfcRecordType, finalData);
      
      // A4: Bulk Mode Success Handling
      if (isBulkMode) {
        const newCount = bulkCount + 1;
        setBulkCount(newCount);
        setBulkLog(prev => [{ index: newCount, status: 'success', message: `Tag #${newCount} berhasil` }, ...prev]);
        
        if (bulkTarget && newCount >= bulkTarget) {
          setBulkStatus('done');
          setStatus('idle');
          toast.success('Bulk Write Selesai!');
          return;
        }
        
        toast.success(`Tag #${newCount} berhasil! Siapkan tag berikutnya...`);
        // Stay in waiting_for_tap state for bulk
      } else {
        toast.success('Berhasil menulis ke NFC!');
        setStatus('idle');
      }

      // Logging
      await logActivity({
        action: 'tag_written',
        tagId: selectedDbTag || null,
        performedBy: userId,
        metadata: { record_type: recordType, preview: finalData.substring(0, 50) }
      });

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal menulis';
      toast.error(msg);
      if (isBulkMode) {
        setBulkLog(prev => [{ index: bulkCount + 1, status: 'error', message: msg }, ...prev]);
      }
      setStatus('idle');
    }
  }

  if (!isSupported) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/10">
        <CardContent className="p-6 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-sm font-medium text-amber-600">Web NFC hanya tersedia di Chrome Android.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {status === 'waiting_for_tap' ? (
        <Card className={cn("border-2 animate-in zoom-in duration-300", recordType === 'erase' ? "border-destructive" : "border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]")}>
          <CardContent className="p-10 text-center space-y-6">
            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Wifi className="w-12 h-12 text-primary animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold text-2xl">
                {isBulkMode ? `Bulk Write: Tag #${bulkCount + 1}` : 'Siap Menulis'}
              </h3>
              <p className="text-muted-foreground">Tempelkan NFC Tag ke bagian belakang perangkat Anda.</p>
            </div>

            {isBulkMode && (
              <div className="bg-muted p-4 rounded-xl space-y-1">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Progress</p>
                <p className="text-xl font-black">{bulkCount} / {bulkTarget || '∞'}</p>
              </div>
            )}

            <Button variant="outline" onClick={() => { setStatus('idle'); setBulkStatus('idle'); }} className="w-full">
              Batal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black flex items-center gap-2">
                    <PenSquare className="w-6 h-6 text-primary" />
                    Write NFC Tag
                  </CardTitle>
                  <CardDescription>Pilih mode dan data yang ingin ditulis ke chip NFC.</CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                  <Button 
                    variant={!isBulkMode ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setIsBulkMode(false)}
                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  >Single</Button>
                  <Button 
                    variant={isBulkMode ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setIsBulkMode(true)}
                    className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  >Bulk</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="standard" className="w-full" onValueChange={(v) => {
                if (v === 'standard') setRecordType('url');
                else if (v === 'attendance') setRecordType('attendance');
                else if (v === 'database') setRecordType('database');
              }}>
                <TabsList className="grid w-full grid-cols-3 h-12">
                  <TabsTrigger value="standard" className="font-bold">Standard</TabsTrigger>
                  <TabsTrigger value="attendance" className="font-bold">Absensi</TabsTrigger>
                  <TabsTrigger value="database" className="font-bold">Sync DB</TabsTrigger>
                </TabsList>

                {/* Standard Mode */}
                <TabsContent value="standard" className="pt-4 space-y-6">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'url', icon: LinkIcon, label: 'URL' },
                      { id: 'text', icon: Type, label: 'Text' },
                      { id: 'phone', icon: Phone, label: 'Telp' },
                      { id: 'sms', icon: MessageSquare, label: 'SMS' },
                      { id: 'email', icon: Mail, label: 'Mail' },
                      { id: 'erase', icon: Eraser, label: 'Hapus' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRecordType(t.id as RecordType)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                          recordType === t.id ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <t.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {recordType === 'url' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target URL</Label>
                          <Input 
                            placeholder="google.com" 
                            value={data} 
                            onChange={(e) => setData(e.target.value)} 
                            className="h-12 text-lg font-medium"
                          />
                        </div>
                        
                        {/* A3: Link Protection Toggle */}
                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                <Lock className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold">Link Protection</p>
                                <p className="text-[10px] text-muted-foreground">Minta password sebelum redirect.</p>
                              </div>
                            </div>
                            <Switch checked={useLinkProtection} onCheckedChange={setUseLinkProtection} />
                          </div>
                          
                          {useLinkProtection && (
                            <div className="space-y-2 animate-in slide-in-from-top-2">
                              <Label className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">Set Password Link</Label>
                              <Input 
                                type="password" 
                                placeholder="Min. 4 Karakter" 
                                value={linkPassword}
                                onChange={(e) => setLinkPassword(e.target.value)}
                                className="bg-white"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {recordType === 'text' && (
                      <Textarea 
                        placeholder="Masukkan pesan teks..." 
                        value={data} 
                        onChange={(e) => setData(e.target.value)}
                        className="min-h-[120px] text-lg"
                      />
                    )}

                    {recordType === 'erase' && (
                      <div className="p-6 bg-destructive/5 border-2 border-destructive/20 border-dashed rounded-2xl text-center space-y-2">
                        <Eraser className="w-10 h-10 text-destructive mx-auto" />
                        <p className="text-sm font-bold text-destructive uppercase tracking-widest">Wipe Clear Mode</p>
                        <p className="text-xs text-muted-foreground">Semua data di tag akan dihapus total.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Attendance Mode */}
                <TabsContent value="attendance" className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Database className="w-3 h-3" /> Instansi / Organisasi</Label>
                    <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Contoh: Bimbel Pintar / PT Maju Jaya" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><User className="w-3 h-3" /> Nama Peserta</Label>
                      <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Nama lengkap peserta" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Grup / Kelas</Label>
                      <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Contoh: XII RPL / Karyawan" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Layers className="w-3 h-3" /> Mata Pelajaran (Opsional)</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Matematika" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><Send className="w-3 h-3" /> WA Guru (Format 628...)</Label>
                    <Input value={teacherPhone} onChange={(e) => setTeacherPhone(e.target.value)} placeholder="628123456789" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Template WA</Label>
                    </div>
                    <Textarea 
                      value={msgTemplate} 
                      onChange={(e) => setMsgTemplate(e.target.value)}
                      className="text-xs font-mono bg-muted"
                      rows={4}
                    />
                  </div>
                </TabsContent>

                {/* Database Sync Mode */}
                <TabsContent value="database" className="pt-4 space-y-4">
                  <select 
                    className="w-full h-12 px-4 rounded-xl bg-muted font-bold text-sm"
                    value={selectedDbTag}
                    onChange={(e) => {
                      setSelectedDbTag(e.target.value);
                      const tag = dbTags.find(t => t.id === e.target.value);
                      if (tag) setData(JSON.stringify(tag.payload_data));
                    }}
                  >
                    <option value="">-- Pilih Tag Managed --</option>
                    {dbTags.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </TabsContent>
              </Tabs>

              {/* A4: Bulk Write Settings */}
              {isBulkMode && (
                <div className="p-4 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-4 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Layers className="w-5 h-5" />
                    <span className="font-black uppercase text-sm">Bulk Settings</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Target Jumlah Tag (Kosongkan = Tanpa Batas)</Label>
                    <Input 
                      type="number" 
                      placeholder="Contoh: 50" 
                      value={bulkTarget || ''} 
                      onChange={(e) => setBulkTarget(e.target.value ? parseInt(e.target.value) : null)}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}

              <Button 
                onClick={handleWriteClick} 
                className={cn("w-full h-14 text-lg font-black shadow-lg uppercase tracking-widest", recordType === 'erase' ? "bg-destructive hover:bg-destructive/90" : "bg-primary")}
                disabled={status === 'waiting_for_tap'}
              >
                {recordType === 'erase' ? 'Format & Hapus' : (isBulkMode ? 'Mulai Bulk Write' : 'Tulis ke Tag')}
              </Button>
            </CardContent>
          </Card>

          {/* Bulk Log */}
          {isBulkMode && bulkLog.length > 0 && (
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="p-4 bg-muted/50 border-b flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-widest">Bulk Write Log</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-primary text-primary-foreground rounded-full">{bulkCount} Berhasil</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y">
                {bulkLog.map((log, i) => (
                  <div key={i} className="p-3 flex items-center gap-3 text-xs">
                    {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    <span className="font-bold">#{log.index}</span>
                    <span className="text-muted-foreground">{log.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* A2: NFC Password Confirm Modal */}
      <NfcPasswordModal
        isOpen={showPasswordModal}
        operation="write"
        onSuccess={() => {
          setShowPasswordModal(false);
          initiateWrite();
        }}
        onCancel={() => setShowPasswordModal(false)}
      />
    </div>
  );
}
