'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isNFCSupported, readTag, writeTag } from '@/lib/nfc-service';
import { logActivity } from '@/lib/activity-logger';
import { toast } from 'sonner';
import type { NfcServiceStatus, NfcReadResult } from '@/lib/types';
import { TagRegistrationForm } from './tag-registration-form';
import { Wifi, AlertCircle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScannerUIProps {
  userId: string;
  userEmail: string;
  userName: string;
}

const statusConfig: Record<
  NfcServiceStatus,
  { label: string; sublabel: string; icon: React.ElementType; iconClass: string; ringColor: string }
> = {
  idle: {
    label: 'Ready to Scan',
    sublabel: 'Tap an NFC tag to your device to begin.',
    icon: Wifi,
    iconClass: 'text-blue-400',
    ringColor: 'border-blue-500/30',
  },
  scanning: {
    label: 'Hold Tag Near Device',
    sublabel: 'Keep the tag steady while we read it.',
    icon: Loader2,
    iconClass: 'text-blue-400 animate-spin',
    ringColor: 'border-blue-500',
  },
  success: {
    label: 'Tag Detected!',
    sublabel: 'Fill in the details below to register this tag.',
    icon: CheckCircle,
    iconClass: 'text-emerald-400',
    ringColor: 'border-emerald-500',
  },
  error: {
    label: 'Scan Failed',
    sublabel: 'Could not read the NFC tag. Try again.',
    icon: XCircle,
    iconClass: 'text-red-400',
    ringColor: 'border-red-500/60',
  },
  unsupported: {
    label: 'Not Supported',
    sublabel: 'Web NFC requires Android Chrome. Please use a supported device.',
    icon: AlertCircle,
    iconClass: 'text-amber-400',
    ringColor: 'border-amber-500/40',
  },
};

export function ScannerUI({ userId, userEmail, userName }: ScannerUIProps) {
  const [status, setStatus] = useState<NfcServiceStatus>('idle');
  const [scanResult, setScanResult] = useState<NfcReadResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNFCSupported()) {
      setStatus('unsupported');
    }
    return () => { cleanupRef.current?.(); };
  }, []);

  async function startScan() {
    if (!isNFCSupported()) return;

    setStatus('scanning');
    setIsScanning(true);
    setScanResult(null);

    try {
      const cleanup = await readTag(
        (result) => {
          setScanResult(result);
          setStatus('success');
          setIsScanning(false);
          cleanupRef.current?.();
        },
        (error) => {
          console.error('[NFC]', error);
          setStatus('error');
          setIsScanning(false);
          toast.error(error.message);
        }
      );
      cleanupRef.current = cleanup;
    } catch (err) {
      setStatus('error');
      setIsScanning(false);
      toast.error('Failed to start NFC scan');
      console.error(err);
    }
  }

  function reset() {
    cleanupRef.current?.();
    setStatus('idle');
    setScanResult(null);
    setIsScanning(false);
  }

  async function handleRegister(data: {
    label: string;
    assignedTo: string;
    tagStatus: 'active' | 'inactive';
  }) {
    if (!scanResult) return;

    const supabase = createClient();
    const payload = {
      label: data.label,
      assigned_to: data.assignedTo,
      registered_at: new Date().toISOString(),
      registered_by: userEmail,
    };

    // Check if tag already registered
    const { data: existing } = await supabase
      .from('nfc_tags')
      .select('id')
      .eq('serial_number', scanResult.serialNumber)
      .single();

    if (existing) {
      toast.error('This NFC tag is already registered.');
      return;
    }

    // Insert into DB
    const { data: newTag, error: insertError } = await supabase
      .from('nfc_tags')
      .insert({
        serial_number: scanResult.serialNumber,
        label: data.label,
        assigned_to: data.assignedTo,
        status: data.tagStatus,
        payload_data: payload,
        created_by: userId,
      })
      .select('id')
      .single();

    if (insertError || !newTag) {
      toast.error('Failed to register tag: ' + insertError?.message);
      return;
    }

    // Write payload back to physical tag
    try {
      await writeTag(payload);
    } catch {
      toast.warning('Tag registered in DB but write to physical tag failed.');
    }

    // Log activity with admin info in metadata
    await logActivity({
      action: 'tag_registered',
      tagId: newTag.id,
      performedBy: userId,
      metadata: {
        serial_number: scanResult.serialNumber,
        label: data.label,
        performer_email: userEmail,
        performer_name: userName,
      },
    });

    toast.success(`Tag "${data.label}" registered successfully!`);
    reset();
  }

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* NFC Visual */}
      <div className="relative flex items-center justify-center">
        {/* Animated rings when scanning */}
        {status === 'scanning' && (
          <>
            <span className="absolute w-32 h-32 rounded-full border-2 border-blue-500/50 animate-nfc-ring" />
            <span className="absolute w-32 h-32 rounded-full border-2 border-blue-500/50 animate-nfc-ring-2" />
            <span className="absolute w-32 h-32 rounded-full border-2 border-blue-500/50 animate-nfc-ring-3" />
          </>
        )}

        {/* Main icon circle */}
        <div
          className={cn(
            'relative w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500',
            'bg-[hsl(var(--card))] shadow-xl',
            cfg.ringColor,
            status === 'idle' && 'animate-nfc-pulse'
          )}
        >
          <Icon className={cn('w-10 h-10', cfg.iconClass)} />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-1.5">
        <h2 className="text-xl font-semibold text-[hsl(var(--foreground))]">{cfg.label}</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] max-w-xs">{cfg.sublabel}</p>
      </div>

      {/* Scan result info */}
      {scanResult && status === 'success' && (
        <div className="w-full max-w-sm bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium mb-1">Serial Number</p>
          <p className="font-mono text-sm text-[hsl(var(--foreground))] break-all">{scanResult.serialNumber}</p>
          {scanResult.message && (
            <>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-medium mt-2 mb-1">Existing Payload</p>
              <p className="font-mono text-xs text-[hsl(var(--muted-foreground))] break-all">{scanResult.message}</p>
            </>
          )}
        </div>
      )}

      {/* Action buttons */}
      {status === 'unsupported' ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 max-w-sm w-full text-center">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Web NFC is only available on <strong>Android Chrome</strong> (version 89+) over HTTPS.
          </p>
        </div>
      ) : status === 'success' && scanResult ? (
        <div className="w-full max-w-sm">
          <TagRegistrationForm
            serialNumber={scanResult.serialNumber}
            onRegister={handleRegister}
            onCancel={reset}
          />
        </div>
      ) : (
        <div className="flex gap-3">
          {(status === 'idle' || status === 'error') && (
            <Button
              onClick={startScan}
              className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 px-8"
            >
              <Wifi className="w-4 h-4 mr-2" />
              Start Scanning
            </Button>
          )}
          {isScanning && (
            <Button
              variant="outline"
              onClick={reset}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
