import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ProductForm } from '@/components/dashboard/product-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
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

  // 3. Fetch product by ID
  const { data: product, error } = await supabase
    .from('catalog_products')
    .select('*')
    .eq('id', parseInt(id))
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <div className="pb-20">
      <ProductForm product={product} />
    </div>
  );
}
