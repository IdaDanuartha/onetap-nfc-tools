import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/keychains/bulk-unclaim
// Resets multiple keychain tokens to unclaimed status (user_id = null) — does NOT delete data
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify authorized user
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

    // Read payload
    const { tokens } = await req.json().catch(() => ({}));

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ success: false, error: 'Tokens tidak disediakan atau kosong' }, { status: 400 });
    }

    // Reset user_id to null for all given tokens — status becomes unclaimed
    const { error: updateError } = await supabase
      .from('user_keychains')
      .update({ user_id: null })
      .in('token', tokens);

    if (updateError) {
      console.error('[Bulk Unclaim Keychains] Database error:', updateError);
      return NextResponse.json({ success: false, error: `Gagal mereset keychains: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${tokens.length} keychain berhasil direset ke unclaimed`
    });

  } catch (err: any) {
    console.error('[Bulk Unclaim Keychains] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
