import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/keychains/bulk-delete
// Deletes multiple keychain tokens from user_keychains by token list
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

    // Delete the keychains from public.user_keychains
    const { error: deleteError } = await supabase
      .from('user_keychains')
      .delete()
      .in('token', tokens);

    if (deleteError) {
      console.error('[Bulk Delete Keychains] Database error:', deleteError);
      return NextResponse.json({ success: false, error: `Gagal menghapus keychains: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${tokens.length} keychain berhasil dihapus`
    });

  } catch (err: any) {
    console.error('[Bulk Delete Keychains] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
