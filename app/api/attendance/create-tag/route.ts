import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// POST /api/attendance/create-tag
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const token = randomBytes(16).toString('hex');

    const { error } = await supabase.from('attendance_tags').insert({
      token,
      student_name: body.student_name,
      school_name: body.school_name,
      class_name: body.class_name,
      subject: body.subject,
      teacher_phone: body.teacher_phone,
      message_template: body.message_template,
      created_by: user.id
    });

    if (error) throw error;

    const baseUrl = 'https://onetap-charm.com';
    return NextResponse.json({ 
      success: true, 
      url: `${baseUrl}/attend/${token}` 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: 'Failed to create attendance tag' }, { status: 500 });
  }
}
