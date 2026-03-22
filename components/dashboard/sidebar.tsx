'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Wifi,
  Tags,
  PenSquare,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { AdminUser } from '@/lib/types';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/scanner', label: 'Scanner', icon: Wifi },
  { href: '/write', label: 'Write', icon: PenSquare },
  { href: '/tags', label: 'Tags', icon: Tags },
];

interface SidebarProps {
  user: AdminUser;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
    router.refresh();
  }

  const initials = user.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center shadow-sm">
          <Wifi className="w-4 h-4 text-[hsl(var(--primary-foreground))]" />
        </div>
        <div>
          <p className="font-semibold text-sm text-[hsl(var(--sidebar-foreground))] leading-none">OneTap NFC</p>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Admin Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-3 py-4 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">
              {user.display_name ?? 'Admin'}
            </p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <ThemeToggle className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
