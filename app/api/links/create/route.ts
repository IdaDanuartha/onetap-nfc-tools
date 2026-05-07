import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// POST /api/links/create
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { originalUrl, password } = await req.json();
    const token = randomBytes(16).toString('hex');
    
    let passwordHash = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { error } = await supabase.from('protected_links').insert({
      token,
      original_url: originalUrl,
      is_protected: !!password,
      password_hash: passwordHash,
      created_by: user.id
    });

    if (error) throw error;

    const baseUrl = 'https://onetap-charm.com';
    return NextResponse.json({ 
      success: true, 
      url: `${baseUrl}/r/${token}` 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: 'Failed to create link' }, { status: 500 });
  }
}
