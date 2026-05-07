import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TagsManager } from '@/components/nfc/tags-manager';

export default async function TagsTemplatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: templates } = await supabase
    .from('nfc_tags')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="pb-20">
      <TagsManager initialTemplates={templates || []} />
    </div>
  );
}
