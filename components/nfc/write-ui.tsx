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
  CheckCircle2, Copy, Download, AppWindow, ChevronDown,
  Search, X, CalendarDays, ExternalLink, QrCode
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

type RecordType = 'url' | 'text' | 'phone' | 'sms' | 'email' | 'database' | 'attendance' | 'erase' | 'keychain' | 'app';

const POPULAR_APPS = [
  { name: 'WhatsApp', package: 'com.whatsapp', iosUrl: 'https://wa.me' },
  { name: 'Instagram', package: 'com.instagram.android', iosUrl: 'https://instagram.com' },
  { name: 'TikTok', package: 'com.zhiliaoapp.musically', iosUrl: 'https://tiktok.com' },
  { name: 'YouTube', package: 'com.google.android.youtube', iosUrl: 'https://youtube.com' },
  { name: 'Facebook', package: 'com.facebook.katana', iosUrl: 'https://facebook.com' },
  { name: 'Spotify', package: 'com.spotify.music', iosUrl: 'https://open.spotify.com' },
  { name: 'Telegram', package: 'org.telegram.messenger', iosUrl: 'https://t.me' },
  { name: 'Twitter / X', package: 'com.twitter.android', iosUrl: 'https://x.com' },
  { name: 'DANA', package: 'id.dana', iosUrl: 'https://dana.id' },
  { name: 'GoPay / Gojek', package: 'com.gojek.app', iosUrl: 'https://gojek.com' },
  { name: 'OVO', package: 'id.ovo.android', iosUrl: 'https://ovo.id' },
  { name: 'Shopee', package: 'com.shopee.id', iosUrl: 'https://shopee.co.id' },
  { name: 'Mobile Legends', package: 'com.mobile.legends', iosUrl: 'https://www.mobilelegends.com' },
  { name: 'Netflix', package: 'com.netflix.mediaclient', iosUrl: 'https://netflix.com' },
  { name: 'Google Maps', package: 'com.google.android.apps.maps', iosUrl: 'https://maps.google.com' }
];

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

  // Open App states
  const [appPackage, setAppPackage] = useState('com.whatsapp');
  const [selectedApp, setSelectedApp] = useState('com.whatsapp');
  const [iosUrl, setIosUrl] = useState('https://wa.me');
  const [targetPlatform, setTargetPlatform] = useState<'both' | 'android' | 'ios'>('both');

  // Dynamic Keychain states
  const [keychainToken, setKeychainToken] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);
  const [keychains, setKeychains] = useState<any[]>([]);
  const [loadingKeychains, setLoadingKeychains] = useState(false);
  const [keychainSearch, setKeychainSearch] = useState('');
  const [keychainStatusFilter, setKeychainStatusFilter] = useState<'all' | 'claimed' | 'unclaimed'>('all');
  const [keychainDateFilter, setKeychainDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [keychainPlanFilter, setKeychainPlanFilter] = useState<'all' | 'free' | 'education' | 'professional'>('all');
  const [selectedHistoryKeychain, setSelectedHistoryKeychain] = useState<any | null>(null);

  const fetchKeychains = async () => {
    setLoadingKeychains(true);
    try {
      const res = await fetch('/api/keychains/list');
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Gagal fetch keychains');
      setKeychains(result.data || []);
    } catch (err: any) {
      console.error('Error fetching keychains:', err);
      toast.error('Gagal mengambil data history keychain');
    } finally {
      setLoadingKeychains(false);
    }
  };

  const handleGenerateKeychainToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch('/api/keychains/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setKeychainToken(result.token);
        toast.success(`Token keychain unik berhasil dibuat: ${result.token}`);
        fetchKeychains(); // Refresh the list
      } else {
        throw new Error(result.error || 'Gagal generate token');
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat token unik.');
    } finally {
      setGeneratingToken(false);
    }
  };

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

  useEffect(() => {
    if (recordType === 'keychain') {
      fetchKeychains();
    }
  }, [recordType]);

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
    if (!isSupported) {
      toast.error('Penulisan NFC hanya didukung di Google Chrome di Android.');
      return;
    }
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
    if (recordType === 'keychain') {
      if (!keychainToken.trim()) {
        toast.error('Token keychain belum diisi atau digenerate!');
        return;
      }
    } else if (recordType === 'attendance') {
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

      // Open App logic (multi-record)
      if (recordType === 'app') {
        if (!appPackage && (targetPlatform === 'android' || targetPlatform === 'both')) {
          toast.error('Masukkan Android package name!');
          setStatus('idle');
          return;
        }
        if (!iosUrl && (targetPlatform === 'ios' || targetPlatform === 'both')) {
          toast.error('Masukkan iOS URL!');
          setStatus('idle');
          return;
        }
        // Use writeCustomRecord abstraction won't work for multi-record; write directly
        const ndef = new (window as any).NDEFReader();
        const records: any[] = [];
        if (targetPlatform === 'android') {
          records.push({ recordType: 'android.com:pkg', data: new TextEncoder().encode(appPackage) });
        } else if (targetPlatform === 'ios') {
          records.push({ recordType: 'url', data: iosUrl });
        } else {
          records.push({ recordType: 'url', data: iosUrl });
          records.push({ recordType: 'android.com:pkg', data: new TextEncoder().encode(appPackage) });
        }
        await ndef.write({ records });
        toast.success('Berhasil menulis Open App ke NFC!');
        setStatus('idle');
        await logActivity({
          action: 'tag_written',
          tagId: null,
          performedBy: userId,
          metadata: { record_type: 'app', android: appPackage, ios: iosUrl, platform: targetPlatform }
        });
        return;
      }

      // Keychain / Dynamic Redirect logic
      if (recordType === 'keychain') {
        finalData = `https://onetap-charm.com/r/${keychainToken.trim().toLowerCase()}`;
        nfcRecordType = 'url';
      }
      // A3: Link Protection Logic
      else if (useLinkProtection && recordType === 'url') {
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

  const filteredKeychains = keychains.filter((item) => {
    const matchesSearch = 
      item.token.toLowerCase().includes(keychainSearch.toLowerCase()) ||
      (item.label && item.label.toLowerCase().includes(keychainSearch.toLowerCase())) ||
      (item.active_mode && item.active_mode.toLowerCase().includes(keychainSearch.toLowerCase())) ||
      (item.users_profile?.display_name && item.users_profile.display_name.toLowerCase().includes(keychainSearch.toLowerCase())) ||
      (item.users_profile?.email && item.users_profile.email.toLowerCase().includes(keychainSearch.toLowerCase()));
    
    const isClaimed = item.user_id !== null;
    const matchesStatus = 
      keychainStatusFilter === 'all' ||
      (keychainStatusFilter === 'claimed' && isClaimed) ||
      (keychainStatusFilter === 'unclaimed' && !isClaimed);
       
    let matchesDate = true;
    if (item.created_at) {
      const date = new Date(item.created_at);
      const now = new Date();
      if (keychainDateFilter === 'today') {
        matchesDate = date.toDateString() === now.toDateString();
      } else if (keychainDateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesDate = date >= weekAgo;
      } else if (keychainDateFilter === 'month') {
        matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
    }

    const userPlan = item.users_profile?.plan || 'free';
    const matchesPlan =
      keychainPlanFilter === 'all' ||
      (!isClaimed && keychainPlanFilter === 'free') || // unclaimed keychains have no plan
      (isClaimed && userPlan === keychainPlanFilter);
     
    return matchesSearch && matchesStatus && matchesDate && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {!isSupported && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-500">Mode Desktop Aktif</p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                Penulisan langsung ke tag NFC fisik hanya didukung di Chrome Android. Namun, Anda tetap bisa membuat keychain token, menyalin link, mengonfigurasi data, dan mengunduh QR Code di sini.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
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
        <div className={cn(
          "grid grid-cols-1 gap-6",
          recordType === 'keychain' && "lg:grid-cols-12 lg:items-start"
        )}>
          <div className={cn(
            "space-y-6",
            recordType === 'keychain' && "lg:col-span-5"
          )}>
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-2">
                    <PenSquare className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                    Write NFC Tag
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">Pilih mode dan data yang ingin ditulis ke chip NFC.</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl self-start sm:self-auto shrink-0">
                  <Button 
                    variant={!isBulkMode ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setIsBulkMode(false)}
                    className={cn(
                      "h-8 text-[10px] font-black uppercase tracking-wider px-3.5 rounded-lg transition-all",
                      !isBulkMode && "shadow-md bg-primary text-primary-foreground hover:bg-primary/95"
                    )}
                  >Single</Button>
                  <Button 
                    variant={isBulkMode ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setIsBulkMode(true)}
                    className={cn(
                      "h-8 text-[10px] font-black uppercase tracking-wider px-3.5 rounded-lg transition-all",
                      isBulkMode && "shadow-md bg-primary text-primary-foreground hover:bg-primary/95"
                    )}
                  >Bulk</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="standard" className="w-full" onValueChange={(v) => {
                if (v === 'standard') setRecordType('url');
                else if (v === 'attendance') setRecordType('attendance');
                else if (v === 'keychain') setRecordType('keychain');
                else if (v === 'database') setRecordType('database');
              }}>
                <TabsList className="grid w-full grid-cols-4 h-12">
                  <TabsTrigger value="standard" className="font-bold text-xs">Standard</TabsTrigger>
                  <TabsTrigger value="attendance" className="font-bold text-xs">Absensi</TabsTrigger>
                  <TabsTrigger value="keychain" className="font-bold text-xs">Keychain</TabsTrigger>
                  <TabsTrigger value="database" className="font-bold text-xs">Sync DB</TabsTrigger>
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
                      { id: 'app', icon: AppWindow, label: 'Open App' },
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
                    {recordType === 'app' && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">Platform Target</Label>
                          <div className="flex bg-muted border border-border rounded-xl p-1 w-full">
                            {[
                              { id: 'both', label: 'Semua (Android & iOS)' },
                              { id: 'android', label: 'Android' },
                              { id: 'ios', label: 'iOS (Apple)' }
                            ].map((platform) => (
                              <button
                                key={platform.id}
                                type="button"
                                onClick={() => setTargetPlatform(platform.id as any)}
                                className={cn(
                                  "flex-1 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider",
                                  targetPlatform === platform.id
                                    ? 'bg-background text-primary shadow-sm border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {platform.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aplikasi</Label>
                          <div className="relative">
                            <select
                              value={selectedApp}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedApp(val);
                                if (val !== 'custom') {
                                  setAppPackage(val);
                                  const app = POPULAR_APPS.find(a => a.package === val);
                                  if (app) setIosUrl(app.iosUrl);
                                } else {
                                  setAppPackage('');
                                  setIosUrl('');
                                }
                              }}
                              className="w-full h-12 px-4 pr-10 rounded-xl bg-background border border-border font-bold text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {POPULAR_APPS.map(app => (
                                <option key={app.package} value={app.package}>{app.name}</option>
                              ))}
                              <option value="custom">Kustom (Ketik Sendiri)</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {selectedApp === 'custom' && (
                          <div className="space-y-2 animate-in slide-in-from-top-2">
                            {(targetPlatform === 'both' || targetPlatform === 'android') && (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Android Package Name</Label>
                                <Input
                                  value={appPackage}
                                  onChange={(e) => setAppPackage(e.target.value)}
                                  placeholder="Contoh: com.whatsapp"
                                  className="font-mono"
                                />
                              </div>
                            )}
                            {(targetPlatform === 'both' || targetPlatform === 'ios') && (
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">iOS Universal Link / URL</Label>
                                <Input
                                  value={iosUrl}
                                  onChange={(e) => setIosUrl(e.target.value)}
                                  placeholder="Contoh: https://wa.me"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Mode <span className="font-bold">Semua</span>: Menulis 2 record — URL (untuk iOS) + AAR (untuk Android). Mode <span className="font-bold">Android</span>: Hanya AAR. Mode <span className="font-bold">iOS</span>: Hanya URL.
                        </p>
                      </div>
                    )}

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

                {/* Keychain Mode */}
                <TabsContent value="keychain" className="pt-4 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-5">
                    <div className="flex items-center gap-3 text-primary">
                      <PenSquare className="w-5 h-5" />
                      <span className="font-black uppercase text-sm tracking-wide">Dynamic Redirect Generator</span>
                    </div>

                    <div className="space-y-4">
                      {/* Input + Generate Button Row */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keychain Token</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Contoh: key-xyz123"
                            value={keychainToken}
                            onChange={(e) => setKeychainToken(e.target.value)}
                            className="h-12 bg-white text-base font-bold font-mono tracking-wider focus-visible:ring-primary"
                          />
                          <Button
                            type="button"
                            onClick={handleGenerateKeychainToken}
                            disabled={generatingToken}
                            className="h-12 px-5 font-bold bg-primary text-white shrink-0 rounded-xl"
                          >
                            {generatingToken ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              'Generate Token'
                            )}
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Token yang digenerate dijamin unik dan otomatis terdaftar di database untuk diklaim pelanggan nanti.
                        </p>
                      </div>

                      {/* Display Redirect Link */}
                      {keychainToken && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Dynamic Redirect Link</Label>
                            <div className="p-3 bg-muted rounded-xl flex items-center justify-between font-mono text-xs select-all border border-border/50">
                              <span>https://onetap-charm.com/r/{keychainToken.trim().toLowerCase()}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                type="button"
                                className="h-7 w-7 p-0 rounded-md hover:bg-slate-200"
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://onetap-charm.com/r/${keychainToken.trim().toLowerCase()}`);
                                  toast.success('Link disalin!');
                                }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Dynamic QR Code */}
                          <div className="p-4 bg-white rounded-2xl border border-border/50 flex flex-col items-center justify-center space-y-4">
                            <div className="text-xs font-bold text-muted-foreground">Generated Keychain QR Code</div>
                            <div className="relative p-2 border-2 border-slate-100 rounded-xl bg-white shadow-sm">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://onetap-charm.com/r/${keychainToken.trim().toLowerCase()}`)}`}
                                alt="Keychain QR"
                                className="w-44 h-44 object-contain"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="font-bold text-xs gap-1.5 h-9 rounded-lg"
                              onClick={() => {
                                const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`https://onetap-charm.com/r/${keychainToken.trim().toLowerCase()}`)}`;
                                const link = document.createElement('a');
                                link.href = url;
                                link.target = '_blank';
                                link.download = `qr_${keychainToken}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="w-4 h-4" /> Download QR Code
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
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

          {recordType === 'keychain' && (
            <div className="lg:col-span-7 space-y-6">
              {/* Keychain History Card */}
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg font-black flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        KEYCHAIN HISTORY
                      </CardTitle>
                      <CardDescription className="text-xs">Daftar token keychain yang terdaftar di database.</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchKeychains} 
                      disabled={loadingKeychains}
                      className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5 self-end sm:self-auto"
                    >
                      <RefreshCcw className={cn("w-3 h-3", loadingKeychains && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Filters Block */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cari token..." 
                        className="pl-9 h-10 bg-background text-xs"
                        value={keychainSearch}
                        onChange={(e) => setKeychainSearch(e.target.value)}
                      />
                      {keychainSearch && (
                        <button 
                          onClick={() => setKeychainSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <select 
                        className="h-10 px-3 rounded-lg bg-muted font-bold text-[10px] uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 border-r-4 border-transparent"
                        value={keychainStatusFilter}
                        onChange={(e) => setKeychainStatusFilter(e.target.value as any)}
                      >
                        <option value="all">Semua Status</option>
                        <option value="claimed">Claimed</option>
                        <option value="unclaimed">Unclaimed</option>
                      </select>

                      <select 
                        className="h-10 px-3 rounded-lg bg-muted font-bold text-[10px] uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 border-r-4 border-transparent"
                        value={keychainPlanFilter}
                        onChange={(e) => setKeychainPlanFilter(e.target.value as any)}
                      >
                        <option value="all">Semua Plan</option>
                        <option value="free">Free</option>
                        <option value="education">Education</option>
                        <option value="professional">Professional</option>
                      </select>

                      <select 
                        className="h-10 px-3 rounded-lg bg-muted font-bold text-[10px] uppercase tracking-wider outline-none focus:ring-2 focus:ring-primary/20 border-r-4 border-transparent"
                        value={keychainDateFilter}
                        onChange={(e) => setKeychainDateFilter(e.target.value as any)}
                      >
                        <option value="all">Semua Waktu</option>
                        <option value="today">Hari Ini</option>
                        <option value="week">7 Hari</option>
                        <option value="month">Bulan Ini</option>
                      </select>
                    </div>
                  </div>

                  {/* Table list */}
                  {loadingKeychains ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Memuat data history...</p>
                    </div>
                  ) : filteredKeychains.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-border/60 rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground/50">
                      <CalendarDays className="w-10 h-10" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider">Tidak ada data</p>
                        <p className="text-[10px]">Coba sesuaikan pencarian atau filter.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/40 shadow-sm max-h-[420px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/30 text-[9px] uppercase font-bold text-muted-foreground tracking-widest border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                          <tr>
                            <th className="px-4 py-3">Token</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">Dibuat</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y bg-background/30">
                          {filteredKeychains.map((item) => {
                            const isClaimed = item.user_id !== null;
                            const dateFormatted = item.created_at
                              ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
                              : '-';
                            return (
                              <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                                <td className="px-4 py-3 font-mono font-bold text-foreground">
                                  {item.token}
                                </td>
                                <td className="px-4 py-3">
                                  {isClaimed ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] uppercase border border-emerald-100 dark:border-emerald-900/30">
                                      Claimed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase border border-slate-200 dark:border-slate-700">
                                      Unclaimed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {isClaimed && item.users_profile?.plan ? (
                                    <span className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border",
                                      item.users_profile.plan === 'professional'
                                        ? "bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/30"
                                        : item.users_profile.plan === 'education'
                                        ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30"
                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                    )}>
                                      {item.users_profile.plan}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-muted-foreground/50">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                                  {dateFormatted}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      title="Lihat QR Code"
                                      onClick={() => setSelectedHistoryKeychain(item)}
                                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                                    >
                                      <QrCode className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      title="Copy Link Redirect"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`https://onetap-charm.com/r/${item.token}`);
                                        toast.success('Link disalin!');
                                      }}
                                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="xs"
                                      title="Gunakan Token"
                                      onClick={() => {
                                        setKeychainToken(item.token);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                        toast.success('Token keychain dimuat ke form!');
                                      }}
                                      className="h-7 text-[9px] font-black uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 rounded-md px-2 ml-1"
                                    >
                                      Gunakan
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Selected History Keychain QR Modal */}
      {selectedHistoryKeychain && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedHistoryKeychain(null); }}
        >
          <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setSelectedHistoryKeychain(null)}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Title */}
            <h2 className="text-lg font-black text-[hsl(var(--foreground))] mb-1 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Detail QR Code
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-5">
              Token: <span className="font-mono font-bold bg-muted px-1.5 py-0.5 rounded text-foreground">{selectedHistoryKeychain.token}</span>
            </p>

            {/* QR Image */}
            <div className="p-4 bg-white rounded-2xl border border-border/50 flex flex-col items-center justify-center space-y-4 mb-5">
              <div className="relative p-2 border-2 border-slate-100 rounded-xl bg-white shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://onetap-charm.com/r/${selectedHistoryKeychain.token}`)}`}
                  alt="Keychain QR"
                  className="w-44 h-44 object-contain"
                />
              </div>
              
              <div className="w-full text-center space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Redirect URL</span>
                <span className="text-xs font-mono select-all bg-slate-50 dark:bg-slate-900 border px-3 py-1.5 rounded-lg block overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 dark:text-slate-300">
                  https://onetap-charm.com/r/{selectedHistoryKeychain.token}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs font-bold"
                onClick={() => {
                  navigator.clipboard.writeText(`https://onetap-charm.com/r/${selectedHistoryKeychain.token}`);
                  toast.success('Link disalin!');
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
              </Button>
              <Button
                className="flex-1 text-xs font-bold bg-primary text-white"
                onClick={() => {
                  const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`https://onetap-charm.com/r/${selectedHistoryKeychain.token}`)}`;
                  const link = document.createElement('a');
                  link.href = url;
                  link.target = '_blank';
                  link.download = `qr_${selectedHistoryKeychain.token}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download QR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
