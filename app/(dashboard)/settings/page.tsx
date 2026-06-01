import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/dashboard/settings-form';
import type { AdminUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  
  // 1. Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Verify user is an admin
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // If not an admin, redirect to root dashboard
    redirect('/');
  }

  const adminUser: AdminUser = {
    id: user.id,
    email: user.email ?? '',
    display_name: profile.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };

  return (
    <div className="pb-20">
      <SettingsForm user={adminUser} />
    </div>
  );
}
