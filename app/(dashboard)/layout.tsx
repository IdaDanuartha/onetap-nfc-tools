import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import type { AdminUser } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const adminUser: AdminUser = {
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  };

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      {/* Desktop sidebar */}
      <Sidebar user={adminUser} />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--sidebar))]">
          <div className="flex items-center gap-3">
            <img src="/images/logo_simple.png" alt="OneTap NFC" className="w-8 h-8 rounded-lg" />
            <span className="text-[hsl(var(--foreground))] font-semibold text-sm">OneTap NFC</span>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
