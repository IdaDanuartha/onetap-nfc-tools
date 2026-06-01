import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductsTable } from '@/components/dashboard/products-table';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
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
    // If not an admin, redirect to root dashboard
    redirect('/');
  }

  // 3. Fetch all products from catalog
  const { data: products, error } = await supabase
    .from('catalog_products')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('[ProductsPage] Error fetching products:', error);
  }

  return (
    <div className="pb-20">
      <ProductsTable initialProducts={products || []} />
    </div>
  );
}
