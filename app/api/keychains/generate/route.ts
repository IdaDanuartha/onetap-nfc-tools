import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function generateRandomToken(length = 7): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'key-';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    token += chars[randomIndex];
  }
  return token;
}

// POST /api/keychains/generate
// Generates a unique, non-duplicate keychain token and registers it as unclaimed in user_keychains
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify authorized user
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let uniqueToken = '';
    let isUnique = false;
    let attempts = 0;

    // Retry loop to ensure token is completely unique and not duplicated in the DB
    while (!isUnique && attempts < 15) {
      attempts++;
      const candidate = generateRandomToken();
      
      const { data: existing, error: checkError } = await supabase
        .from('user_keychains')
        .select('id')
        .eq('token', candidate)
        .maybeSingle();

      if (checkError) {
        console.error('[Generate Keychain] Check error:', checkError);
        throw checkError;
      }

      if (!existing) {
        uniqueToken = candidate;
        isUnique = true;
      }
    }

    if (!uniqueToken) {
      return NextResponse.json({ success: false, error: 'Failed to generate unique token' }, { status: 500 });
    }

    // Pre-register this token in user_keychains as unclaimed so it can be claimed by users
    const { error: insertError } = await supabase
      .from('user_keychains')
      .insert({
        token: uniqueToken,
        user_id: null, // Unclaimed status
        label: 'OneTap Dynamic Keychain',
        active_mode: 'url',
        payload_data: {}
      });

    if (insertError) {
      console.error('[Generate Keychain] Insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Gagal meregistrasi token baru ke database' }, { status: 500 });
    }

    const baseUrl = 'https://onetap-charm.com';
    return NextResponse.json({
      success: true,
      token: uniqueToken,
      url: `${baseUrl}/r/${uniqueToken}`
    });

  } catch (err: any) {
    console.error('[Generate Keychain] Exception:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
