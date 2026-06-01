import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductForm } from '@/components/dashboard/product-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const supabase = await createClient();
  
  // 1. Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Verify user is an admin
  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="pb-20">
      <ProductForm />
    </div>
  );
}
