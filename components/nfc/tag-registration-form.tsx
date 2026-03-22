'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface TagRegistrationFormProps {
  serialNumber: string;
  onRegister: (data: { label: string; assignedTo: string; tagStatus: 'active' | 'inactive' }) => Promise<void>;
  onCancel: () => void;
}

export function TagRegistrationForm({ serialNumber, onRegister, onCancel }: TagRegistrationFormProps) {
  const [label, setLabel] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [tagStatus, setTagStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    setLoading(true);
    try {
      await onRegister({ label: label.trim(), assignedTo: assignedTo.trim(), tagStatus });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="tag-label" className="text-sm font-medium">
          Tag Label <span className="text-red-500">*</span>
        </Label>
        <Input
          id="tag-label"
          placeholder="e.g. Server Room A, Asset #1042"
          value={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="assigned-to" className="text-sm font-medium">
          Assigned To
        </Label>
        <Input
          id="assigned-to"
          placeholder="e.g. John Doe, Room 201"
          value={assignedTo}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssignedTo(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Initial Status</Label>
        <div className="flex gap-2">
          {(['active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTagStatus(s)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-150 ${
                tagStatus === s
                  ? s === 'active'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-600 border-slate-600 text-white'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={loading || !label.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Register Tag'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
