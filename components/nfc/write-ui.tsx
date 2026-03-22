'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, writeCustomRecord } from '@/lib/nfc-service';
import { encryptData } from '@/lib/crypto';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { Wifi, Link as LinkIcon, Type, Loader2, AlertCircle, PenSquare, Phone, MessageSquare, Mail, Database, RefreshCcw, Eraser, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WriteUIProps {
  userId: string;
  userEmail: string;
  userName: string;
}

type RecordType = 'url' | 'text' | 'phone' | 'sms' | 'email' | 'database' | 'erase';

export function WriteUI({ userId, userEmail, userName }: WriteUIProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [recordType, setRecordType] = useState<RecordType>('url');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting_for_tap'>('idle');
  
  // Database mode state
  const [dbTags, setDbTags] = useState<any[]>([]);
  const [selectedDbTag, setSelectedDbTag] = useState('');

  // Security mode state
  const [isSecure, setIsSecure] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    setIsSupported(isNFCSupported());
  }, []);

  // Fetch db tags when database mode is selected
  useEffect(() => {
    if (recordType === 'database' && dbTags.length === 0) {
      const supabase = createClient();
      supabase.from('nfc_tags').select('id, label, serial_number, payload_data, status').eq('status', 'active').then(({data}) => {
        setDbTags(data || []);
      });
    }
  }, [recordType, dbTags.length]);

  async function handleWriteStart() {
    if (recordType !== 'erase' && !data.trim()) {
      toast.error('Please enter data or select a tag to write.');
      return;
    }
    
    let finalData = data;
    let nfcRecordType: 'url' | 'text' | 'json' | 'erase' = 'url';

    if (recordType === 'erase') {
      nfcRecordType = 'erase';
      finalData = '';
    } else if (recordType === 'url') {
      if (!finalData.startsWith('http://') && !finalData.startsWith('https://')) {
        finalData = `https://${finalData}`;
      }
    } else if (recordType === 'text') {
      nfcRecordType = 'text';
    } else if (recordType === 'phone') {
      finalData = `tel:${finalData.replace(/[^0-9+]/g, '')}`;
    } else if (recordType === 'sms') {
      finalData = `sms:${finalData.replace(/[^0-9+]/g, '')}`;
    } else if (recordType === 'email') {
      finalData = `mailto:${finalData.trim()}`;
    } else if (recordType === 'database') {
      nfcRecordType = 'json'; // Database sync writes as application/json
    }

    // Handle AES Application-Level Encryption
    if (isSecure && recordType !== 'erase') {
      if (password.length < 4) {
        toast.error('Encryption password must be at least 4 characters long.');
        return;
      }
      try {
        finalData = await encryptData(finalData, password);
        nfcRecordType = 'text'; // Encrypted strings are safely stored as standard Text NDEF records
      } catch (err) {
        toast.error('Failed to encrypt payload');
        return;
      }
    }

    setStatus('waiting_for_tap');
    toast.info('Hold the NFC tag near your device...');

    try {
      await writeCustomRecord(nfcRecordType, finalData);
      
      let actionDetail = 'Wrote generic payload';
      if (recordType === 'erase') actionDetail = 'Erased NFC Tag records';
      else if (recordType === 'database') actionDetail = 'Synced Supabase JSON to Tag';
      
      if (isSecure) actionDetail += ' (Encrypted with AES-GCM)';

      await logActivity({
        action: 'tag_format', 
        tagId: selectedDbTag || null,
        performedBy: userId,
        metadata: {
          synced_tag_id: recordType === 'database' ? selectedDbTag : undefined,
          action_detail: actionDetail,
          record_type: recordType,
          preview: recordType === 'erase' ? 'Wiped clean' : (isSecure ? '[Encrypted Content]' : finalData.substring(0, 30)),
          performer_email: userEmail,
          performer_name: userName,
        },
      });

      if (recordType === 'erase') toast.success('Tag successfully erased!');
      else toast.success('Successfully wrote data to NFC tag!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to write to tag');
      console.error('[NFC WRITE ERROR]', error);
    } finally {
      setStatus('idle');
    }
  }

  if (!isSupported) {
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

  const renderInputFields = () => {
    switch(recordType) {
      case 'erase':
        return (
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl text-destructive text-sm font-medium">
             This action will completely wipe all NDEF records from the physical NFC tag, returning it to an empty state.
          </div>
        );
      case 'database':
        return (
          <div className="space-y-3">
             <select 
                title="Database Tags"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm transition-all"
                value={selectedDbTag} 
                onChange={(e) => {
                  setSelectedDbTag(e.target.value);
                  const tag = dbTags.find(t => t.id === e.target.value);
                  if (tag) {
                     setData(JSON.stringify(tag.payload_data));
                  }
                }}
             >
                <option value="" disabled>Select an active managed tag...</option>
                {dbTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>{tag.label} ({tag.serial_number})</option>
                ))}
             </select>
             {selectedDbTag && data && (
               <div className="space-y-1.5 mt-2">
                 <p className="text-[10px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5"><RefreshCcw className="w-3 h-3" /> Sync Payload Preview</p>
                 <pre className="text-[11px] bg-card border border-border/40 p-3 rounded-md max-h-36 overflow-y-auto font-mono text-foreground/80">
                   {JSON.stringify(JSON.parse(data), null, 2)}
                 </pre>
               </div>
             )}
          </div>
        );
      case 'url':
        return (
          <div className="relative">
            <Input 
              placeholder="example.com"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="pl-9 h-11"
              type="url"
            />
            <LinkIcon className="absolute left-3 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        );
      case 'phone':
        return (
          <div className="relative">
            <Input 
              placeholder="+628123456789"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="pl-9 h-11"
              type="tel"
            />
            <Phone className="absolute left-3 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        );
      case 'sms':
        return (
           <div className="relative">
            <Input 
              placeholder="+628123456789 (Recipient Number)"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="pl-9 h-11"
              type="tel"
            />
            <MessageSquare className="absolute left-3 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        );
      case 'email':
        return (
           <div className="relative">
            <Input 
              placeholder="hello@example.com"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="pl-9 h-11"
              type="email"
            />
            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        );
      case 'text':
      default:
        return (
          <Textarea 
            placeholder="Enter standard text to write to tag..."
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        );
    }
  };

  const types = [
    { id: 'database', label: 'From Database', icon: Database },
    { id: 'url', label: 'URL / Link', icon: LinkIcon },
    { id: 'text', label: 'Plain Text', icon: Type },
    { id: 'phone', label: 'Phone Call', icon: Phone },
    { id: 'sms', label: 'Send SMS', icon: MessageSquare },
    { id: 'email', label: 'Send Email', icon: Mail },
    { id: 'erase', label: 'Erase Tag', icon: Eraser },
  ] as const;

  return (
    <div className="space-y-6">
      {status === 'waiting_for_tap' ? (
        <Card className={cn("border animate-in zoom-in duration-300", recordType === 'erase' ? "border-destructive" : "border-primary")}>
          <CardContent className="p-8 text-center space-y-4">
            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
              <span className={cn("absolute w-24 h-24 rounded-full border-2 animate-nfc-ring", recordType === 'erase' ? "border-destructive/30" : "border-primary/30")} />
              <span className={cn("absolute w-24 h-24 rounded-full border-2 animate-nfc-ring-2", recordType === 'erase' ? "border-destructive/20" : "border-primary/20")} />
              <Wifi className={cn("w-10 h-10 animate-pulse", recordType === 'erase' ? "text-destructive" : "text-primary")} />
            </div>
            <h3 className="font-semibold text-xl">
               {recordType === 'erase' ? 'Ready to Erase' : 'Ready to Write'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Tap the NFC tag against the back of your device.
            </p>
            <Button variant="outline" onClick={() => setStatus('idle')} className="mt-4">
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[hsl(var(--border))]">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <PenSquare className="w-5 h-5 text-primary" />
              Write Options
            </CardTitle>
            <CardDescription>Format blank tags manually, clone synced payloads, or completely wipe tags.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setRecordType(t.id as RecordType);
                    setData('');
                    setSelectedDbTag('');
                    if (t.id === 'erase') setIsSecure(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all h-24",
                    recordType === t.id 
                      ? (t.id === 'erase' ? "border-destructive bg-destructive/5 text-destructive shadow-sm" : "border-primary bg-primary/5 text-primary shadow-sm")
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <t.icon className={cn("w-5 h-5 md:w-6 md:h-6", recordType === t.id && t.id === 'database' && "text-emerald-500")} />
                  <span className="text-[10px] md:text-[11px] font-semibold tracking-wide uppercase text-center">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Input field */}
            <div className={cn("space-y-3 pt-2 p-4 rounded-xl border border-border/50", recordType === 'erase' ? 'bg-destructive/5' : 'bg-muted/30')}>
              {recordType !== 'erase' && (
                <Label className="text-foreground text-[13px] font-semibold">{recordType === 'database' ? 'Database Source' : 'Data Payload'}</Label>
              )}
              {renderInputFields()}

              {/* Password Encryption Toggle (Hidden for Erase) */}
              {recordType !== 'erase' && (
                <div className="pt-3 border-t border-border/50 mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsSecure(!isSecure)} 
                      className={cn("flex items-center justify-center p-2 rounded-lg border transition-colors", isSecure ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/40" : "bg-card text-muted-foreground border-border")}
                    >
                      {isSecure ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 cursor-pointer" onClick={() => setIsSecure(!isSecure)}>
                      <p className="text-sm font-semibold text-foreground">Secure Payload</p>
                      <p className="text-[10px] text-muted-foreground">Encrypt this data with AES-256 password protection.</p>
                    </div>
                  </div>

                  {isSecure && (
                    <div className="animate-in slide-in-from-top-2 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg space-y-2">
                      <Label className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Encryption Password</Label>
                      <Input 
                        type="password" 
                        className="h-9 border-emerald-500/30 focus-visible:ring-emerald-500" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter a secure password..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              className={cn("w-full h-11 text-primary-foreground shadow-sm text-sm", recordType === 'erase' ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-primary")}
              size="lg"
              onClick={handleWriteStart}
              disabled={recordType !== 'erase' && !data.trim()}
            >
              {recordType === 'erase' ? 'Format & Erase Tag' : 'Write to NFC Tag'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
