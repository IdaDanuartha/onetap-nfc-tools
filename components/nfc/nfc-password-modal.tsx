'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NfcPasswordModalProps {
  isOpen: boolean;
  operation: 'read' | 'write';
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * Modal that intercepts Read/Write NFC operations and requires
 * the user to enter their configured NFC operation password before proceeding.
 * If no password is configured on the server, it passes through silently.
 */
export function NfcPasswordModal({
  isOpen,
  operation,
  onSuccess,
  onClose,
}: NfcPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state and focus input whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError('Masukkan password terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/nfc/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await res.json();

      if (result.success) {
        onSuccess();
      } else {
        setError('Password salah. Silakan coba lagi.');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const operationLabel = operation === 'read' ? 'Read NFC' : 'Write NFC';

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-center text-[hsl(var(--foreground))] mb-1">
          Konfirmasi {operationLabel}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] text-center mb-5">
          Masukkan password untuk melanjutkan operasi ini.
        </p>

        {/* Password input */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="nfc-op-password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="nfc-op-password"
            ref={inputRef}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className={cn(error && 'border-destructive focus-visible:ring-destructive')}
          />
          {error && (
            <p className="text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              'Konfirmasi'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
