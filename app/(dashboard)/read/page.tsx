import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReadUI } from '@/components/nfc/read-ui';

export default async function ReadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="max-w-xl mx-auto mt-4">
        <ReadUI userId={user.id} />
      </div>
    </div>
  );
}
