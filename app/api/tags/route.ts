import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST: Create Template
export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('nfc_tags')
    .insert({
      label: body.label,
      payload_data: body.payload_data,
      status: 'active',
      created_by: user.id,
      serial_number: `TEMPLATE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// PATCH: Update Template
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('nfc_tags')
    .update({
      label: body.label,
      payload_data: body.payload_data,
    })
    .eq('id', body.id)
    .eq('created_by', user.id) // Security: only owner can edit
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE: Delete Template
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('nfc_tags')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
