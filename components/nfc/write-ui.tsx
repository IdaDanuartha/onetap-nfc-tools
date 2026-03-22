'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, writeCustomRecord } from '@/lib/nfc-service';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { Wifi, Link as LinkIcon, Type, Loader2, AlertCircle, PenSquare, Phone, MessageSquare, Mail, Database, RefreshCcw } from 'lucide-react';
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

type RecordType = 'url' | 'text' | 'phone' | 'sms' | 'email' | 'database';

export function WriteUI({ userId, userEmail, userName }: WriteUIProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [recordType, setRecordType] = useState<RecordType>('url');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting_for_tap'>('idle');
  
  // Database mode state
  const [dbTags, setDbTags] = useState<any[]>([]);
  const [selectedDbTag, setSelectedDbTag] = useState('');

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
    if (!data.trim()) {
      toast.error('Please enter data or select a tag to write.');
      return;
    }
    
    // Auto-fix URLs and formats
    let finalData = data;
    let nfcRecordType: 'url' | 'text' | 'json' = 'url';

    if (recordType === 'url') {
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

    setStatus('waiting_for_tap');
    toast.info('Hold the NFC tag near your device...');

    try {
      await writeCustomRecord(nfcRecordType, finalData);
      
      const dbTagMetadata = recordType === 'database' 
         ? { synced_tag_id: selectedDbTag, action_detail: 'Synced Supabase JSON to Tag' } 
         : { action_detail: 'Wrote generic payload' };

      await logActivity({
        action: 'tag_format', 
        tagId: selectedDbTag || null,
        performedBy: userId,
        metadata: {
          ...dbTagMetadata,
          record_type: recordType,
          preview: finalData.substring(0, 30),
          performer_email: userEmail,
          performer_name: userName,
        },
      });

      toast.success('Successfully wrote data to NFC tag!');
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
  ] as const;

  return (
    <div className="space-y-6">
      {status === 'waiting_for_tap' ? (
        <Card className="border-[hsl(var(--primary))] animate-in zoom-in duration-300">
          <CardContent className="p-8 text-center space-y-4">
            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
              <span className="absolute w-24 h-24 rounded-full border-2 border-[hsl(var(--primary))]/30 animate-nfc-ring" />
              <span className="absolute w-24 h-24 rounded-full border-2 border-[hsl(var(--primary))]/20 animate-nfc-ring-2" />
              <Wifi className="w-10 h-10 text-[hsl(var(--primary))] animate-pulse" />
            </div>
            <h3 className="font-semibold text-xl">Ready to Write</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
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
              <PenSquare className="w-5 h-5 text-[hsl(var(--primary))]" />
              Write Options
            </CardTitle>
            <CardDescription>Format blank tags manually or clone sync payloads directly from your managed database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {types.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setRecordType(t.id);
                    setData('');
                    setSelectedDbTag('');
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all h-24",
                    recordType === t.id 
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))] shadow-sm" 
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--muted))]/50"
                  )}
                >
                  <t.icon className={cn("w-5 h-5 md:w-6 md:h-6", recordType === t.id && t.id === 'database' && "text-emerald-500")} />
                  <span className="text-[10px] md:text-[11px] font-semibold tracking-wide uppercase text-center">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Input field */}
            <div className="space-y-3 pt-2 bg-[hsl(var(--muted))]/30 p-4 rounded-xl border border-[hsl(var(--border))]/50">
              <Label className="text-[hsl(var(--foreground))] text-[13px] font-semibold">{recordType === 'database' ? 'Database Source' : 'Data Payload'}</Label>
              {renderInputFields()}
            </div>

            <Button 
              className="w-full h-11 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm text-sm"
              size="lg"
              onClick={handleWriteStart}
              disabled={!data.trim()}
            >
              Write to NFC Tag
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
