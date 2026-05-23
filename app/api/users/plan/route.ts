import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST /api/users/plan
// Allows admin users to manually update another user's plan and expiry date
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Verify authenticated user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify role is admin
    const { data: adminProfile, error: profileError } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya untuk administrator.' }, { status: 403 });
    }

    // 3. Parse request body
    const body = await req.json();
    const { userId, plan, plan_expires_at } = body;

    if (!userId || !plan) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    // 4. Update the user's plan and expiry
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users_profile')
      .update({
        plan,
        plan_expires_at: plan_expires_at || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[Update User Plan] DB Update Error:', updateError);
      return NextResponse.json({ error: `Gagal memperbarui plan pengguna di database: ${updateError.message} (${updateError.code || 'UNKNOWN'})` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile
    });

  } catch (err: any) {
    console.error('[Update User Plan] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
