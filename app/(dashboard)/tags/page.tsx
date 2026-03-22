import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TagsTable } from '@/components/tags/tags-table';
import type { NfcTag, AdminUser } from '@/lib/types';
import { Tags, Plus } from 'lucide-react';
import Link from 'next/link';

export default async function TagsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: tags } = await supabase
    .from('nfc_tags')
    .select('*')
    .order('created_at', { ascending: false });

  const adminUser: AdminUser = {
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
            <Tags className="w-6 h-6" />
            NFC Tags
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {tags?.length ?? 0} tag{(tags?.length ?? 0) !== 1 ? 's' : ''} registered
          </p>
        </div>

        <Link
          href="/scanner"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-md shadow-blue-500/20 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Register New
        </Link>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden shadow-sm">
        <TagsTable
          initial={(tags ?? []) as NfcTag[]}
          userId={adminUser.id}
          userEmail={adminUser.email}
          userName={adminUser.display_name ?? adminUser.email}
        />
      </div>
    </div>
  );
}
