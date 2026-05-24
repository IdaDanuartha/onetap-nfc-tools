import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET /api/keychains/list
// Returns all user_keychains with joined users_profile plan info
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch keychains ordered by created_at desc
    const { data: keychains, error: keychainsError } = await supabase
      .from('user_keychains')
      .select('*')
      .order('created_at', { ascending: false });

    if (keychainsError) throw keychainsError;

    // Get all unique user_ids that have claimed a keychain
    const claimedUserIds = [...new Set(
      (keychains || [])
        .filter(k => k.user_id !== null)
        .map(k => k.user_id)
    )];

    // Fetch user profiles for those IDs
    let profilesMap: Record<string, { plan: string; display_name: string | null; email: string | null }> = {};

    if (claimedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users_profile')
        .select('id, plan, display_name, email')
        .in('id', claimedUserIds);

      if (profiles) {
        profiles.forEach(p => {
          profilesMap[p.id] = { plan: p.plan, display_name: p.display_name, email: p.email };
        });
      }
    }

    // Merge keychain data with profile info
    const enriched = (keychains || []).map(k => ({
      ...k,
      users_profile: k.user_id ? (profilesMap[k.user_id] || null) : null,
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('[Keychains List] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
