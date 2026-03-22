'use client';

import { useState, useEffect } from 'react';
import { isNFCSupported, writeCustomRecord } from '@/lib/nfc-service';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import { Wifi, Link as LinkIcon, Type, Loader2, AlertCircle, PenSquare } from 'lucide-react';
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

type RecordType = 'url' | 'text';

export function WriteUI({ userId, userEmail, userName }: WriteUIProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [recordType, setRecordType] = useState<RecordType>('url');
  const [data, setData] = useState('');
  const [status, setStatus] = useState<'idle' | 'waiting_for_tap'>('idle');

  useEffect(() => {
    setIsSupported(isNFCSupported());
  }, []);

  async function handleWriteStart() {
    if (!data.trim()) {
      toast.error('Please enter data to write.');
      return;
    }
    
    // Auto-fix URLs
    let finalData = data;
    if (recordType === 'url') {
      if (!finalData.startsWith('http://') && !finalData.startsWith('https://')) {
        finalData = `https://${finalData}`;
      }
    }

    setStatus('waiting_for_tap');
    toast.info('Hold the NFC tag near your device...');

    try {
      await writeCustomRecord(recordType, finalData);
      
      await logActivity({
        action: 'tag_format', // using existing format
        // No tag ID since it's a generic tag
        performedBy: userId,
        metadata: {
          action_detail: 'Wrote generic payload',
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
              Write Data
            </CardTitle>
            <CardDescription>Format a blank tag with standard NDEF text or URL.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Type selector */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecordType('url')}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  recordType === 'url' 
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]" 
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/40"
                )}
              >
                <LinkIcon className="w-6 h-6" />
                <span className="text-sm font-medium tracking-wide">URL / Link</span>
              </button>
              
              <button
                type="button"
                onClick={() => setRecordType('text')}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  recordType === 'text' 
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 text-[hsl(var(--primary))]" 
                    : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/40"
                )}
              >
                <Type className="w-6 h-6" />
                <span className="text-sm font-medium tracking-wide">Plain Text</span>
              </button>
            </div>

            {/* Input field */}
            <div className="space-y-2 pt-2">
              <Label>{recordType === 'url' ? 'Web Address' : 'Content'}</Label>
              {recordType === 'url' ? (
                <div className="relative">
                  <Input 
                    placeholder="https://example.com"
                    value={data}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setData(e.target.value)}
                    className="pl-9"
                  />
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                </div>
              ) : (
                <Textarea 
                  placeholder="Enter standard text to write to tag..."
                  value={data}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setData(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              )}
            </div>

            <Button 
              className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
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
