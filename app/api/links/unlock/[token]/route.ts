import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';

// POST /api/links/unlock/[token]
// Verify password and return the original URL if correct.
// Body: { password: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    const { data: link } = await supabase
      .from('protected_links')
      .select('original_url, is_protected, password_hash')
      .eq('token', token)
      .maybeSingle();

    if (!link) {
      return NextResponse.json({ error: 'Link tidak ditemukan' }, { status: 404 });
    }

    // Not password protected — return URL directly
    if (!link.is_protected) {
      return NextResponse.json({ url: link.original_url });
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: 'Password diperlukan' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, link.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 });
    }

    return NextResponse.json({ url: link.original_url });
  } catch (err) {
    console.error('[links/unlock]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
