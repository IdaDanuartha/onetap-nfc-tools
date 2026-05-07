import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/nfc/password-status
// Returns whether the NFC operation password is enabled for the current user.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ enabled: false });
    }

    const { data: record } = await supabase
      .from('nfc_operation_passwords')
      .select('enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({ enabled: record?.enabled ?? false });
  } catch (err) {
    console.error('[password-status]', err);
    return NextResponse.json({ enabled: false });
  }
}
