import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ScannerUI } from '@/components/nfc/scanner-ui';
import type { AdminUser } from '@/lib/types';

export default async function ScannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminUser: AdminUser = {
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">NFC Scanner</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Tap a physical NFC tag to read, register, or write data to it.
        </p>
      </div>

      <div className="max-w-lg mx-auto bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl p-8 shadow-sm">
        <ScannerUI
          userId={adminUser.id}
          userEmail={adminUser.email}
          userName={adminUser.display_name ?? adminUser.email}
        />
      </div>
    </div>
  );
}
