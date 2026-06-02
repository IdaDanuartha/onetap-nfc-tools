import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/keychains/unclaim
// Resets a keychain to unclaimed status by setting user_id to null (does NOT delete data)
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

    // Read the ID of the keychain to unclaim
    const { id } = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ success: false, error: 'Keychain ID tidak disediakan' }, { status: 400 });
    }

    // Reset user_id to null — status becomes unclaimed
    const { error: updateError } = await supabase
      .from('user_keychains')
      .update({ user_id: null })
      .eq('id', id);

    if (updateError) {
      console.error('[Unclaim Keychain] Database error:', updateError);
      return NextResponse.json({ success: false, error: `Gagal mereset keychain: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Keychain berhasil direset ke unclaimed'
    });

  } catch (err: any) {
    console.error('[Unclaim Keychain] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
