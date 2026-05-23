import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UsersManager, UserProfile } from '@/components/dashboard/users-manager';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = await createClient();
  
  // 1. Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Verify user is an admin
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    // If not an admin, redirect to root dashboard
    redirect('/');
  }

  // 3. Fetch all non-admin users
  const { data: nonAdminUsers, error } = await supabase
    .from('users_profile')
    .select('*')
    .or('role.neq.admin,role.is.null')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[UsersPage] Error fetching non-admin users:', error);
  }

  return (
    <div className="pb-20">
      <UsersManager initialUsers={(nonAdminUsers || []) as UserProfile[]} />
    </div>
  );
}
