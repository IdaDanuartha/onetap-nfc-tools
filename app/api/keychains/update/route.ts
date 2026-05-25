import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/keychains/update
// Updates a keychain's label in user_keychains by ID
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
    const { id, label } = await req.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json({ success: false, error: 'Keychain ID tidak disediakan' }, { status: 400 });
    }

    // Update label in public.user_keychains
    const { error: updateError } = await supabase
      .from('user_keychains')
      .update({ label: label || 'OneTap Dynamic Keychain' })
      .eq('id', id);

    if (updateError) {
      console.error('[Update Keychain] Database error:', updateError);
      return NextResponse.json({ success: false, error: `Gagal memperbarui keychain: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Keychain berhasil diperbarui'
    });

  } catch (err: any) {
    console.error('[Update Keychain] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
