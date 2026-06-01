'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, PenSquare, ClipboardList, BookOpen, Layers, 
  ShieldCheck, Users, MoreHorizontal, X, LogOut, ShoppingBag, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
    router.refresh();
  }

  // Primary nav items shown directly on the bar (keeps exactly 5 columns total, extremely clean and thumb-friendly)
  const primaryItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/read', label: 'Read', icon: BookOpen },
    { href: '/write', label: 'Write', icon: PenSquare },
  ];

  // Secondary items placed cleanly in the slide-up "More" drawer
  const moreItems = [
    { href: '/products', label: 'Manage Products', icon: ShoppingBag, desc: 'Kelola Katalog & Produk' },
    { href: '/tags', label: 'Manage Tags', icon: Layers, desc: 'Kelola Keychain & NFC' },
    { href: '/scanner', label: 'Verify Tags', icon: ShieldCheck, desc: 'Verifikasi & Log Scan NFC' },
    { href: '/attendance', label: 'Attendance', icon: ClipboardList, desc: 'Log Kehadiran & Absensi' },
    { href: '/settings', label: 'Settings', icon: Settings, desc: 'Kelola Profil & Sandi Admin' },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[hsl(var(--sidebar))] border-t border-[hsl(var(--sidebar-border))] safe-area-inset-bottom shadow-lg">
        <div className="flex items-stretch justify-around h-16">
          {primaryItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 text-[10px] font-bold transition-all duration-150',
                  active
                    ? 'text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-150',
                    active && 'scale-110'
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}

          {/* More trigger button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-1 px-1 text-[10px] font-bold transition-all duration-150',
              isMoreOpen
                ? 'text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* MORE DRAWER OVERLAY */}
      {isMoreOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsMoreOpen(false)}
        >
          {/* Drawer content sliding up */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-[2.5rem] border-t border-border shadow-2xl p-6 pb-12 space-y-5 transform translate-y-0 transition-transform duration-300 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pill drag indicator indicator */}
            <div className="w-12 h-1.5 bg-muted/80 rounded-full mx-auto -mt-2 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div>
                <h3 className="text-base font-black tracking-tight uppercase">Menu Tambahan</h3>
                <p className="text-[10px] text-muted-foreground font-semibold">Akses fitur admin OneTap NFC lainnya.</p>
              </div>
              <button 
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-3">
              {moreItems.map(({ href, label, icon: Icon, desc }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150 group",
                      active 
                        ? "bg-primary/5 border-primary/20 text-primary" 
                        : "bg-muted/30 border-transparent hover:bg-muted/60 hover:border-border/30 text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      active ? "bg-primary/10 text-primary" : "bg-muted/80 text-muted-foreground group-hover:text-foreground"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                  </Link>
                );
              })}

              {/* Logout Button */}
              <button
                onClick={() => {
                  setIsMoreOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-transparent bg-destructive/5 hover:bg-destructive/10 text-destructive transition-all duration-150 text-left mt-2"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Sign Out</p>
                  <p className="text-xs text-destructive/80">Keluar dari akun admin</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
