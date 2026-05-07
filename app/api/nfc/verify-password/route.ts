import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';

// POST /api/nfc/verify-password
// Verify the NFC operation password for the authenticated user.
// Body: { password: string }
// Returns: { success: boolean }
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const { data: record } = await supabase
      .from('nfc_operation_passwords')
      .select('password_hash, enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    // No password configured → access allowed without password
    if (!record || !record.enabled) {
      return NextResponse.json({ success: true });
    }

    const isValid = await bcrypt.compare(password, record.password_hash);
    return NextResponse.json({ success: isValid });
  } catch (err) {
    console.error('[verify-password]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/nfc/set-password
// Set or update the NFC operation password for the authenticated user.
// Body: { password: string, enabled: boolean }
export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { password, enabled } = await req.json();

    if (enabled && (!password || password.length < 4)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    const passwordHash = enabled && password ? await bcrypt.hash(password, 10) : null;

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      enabled: enabled ?? false,
    };

    if (passwordHash) upsertData.password_hash = passwordHash;

    const { error } = await supabase
      .from('nfc_operation_passwords')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[set-password]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
