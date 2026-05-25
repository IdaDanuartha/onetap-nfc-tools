import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/keychains/delete
// Deletes a keychain token from user_keychains by ID
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

    // Read the ID of the keychain to delete
    const { id } = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ success: false, error: 'Keychain ID tidak disediakan' }, { status: 400 });
    }

    // Delete the keychain from public.user_keychains
    const { error: deleteError } = await supabase
      .from('user_keychains')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Delete Keychain] Database error:', deleteError);
      return NextResponse.json({ success: false, error: `Gagal menghapus keychain: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Keychain berhasil dihapus'
    });

  } catch (err: any) {
    console.error('[Delete Keychain] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
